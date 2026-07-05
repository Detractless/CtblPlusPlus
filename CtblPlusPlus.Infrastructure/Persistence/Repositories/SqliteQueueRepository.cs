using System;
using System.Collections.Generic;
using Microsoft.Data.Sqlite;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Interfaces.Security;
using CtblPlusPlus.Core.Models;

namespace CtblPlusPlus.Infrastructure.Persistence.Repositories;

public class SqliteQueueRepository : SqliteBaseRepository, IQueueRepository
{
    private readonly IHmacProvider _hmacProvider;

    private static bool _kindBackfillDone = false;
    private static readonly object _kindBackfillLock = new();

    private static bool _sigMigrationDone = false;
    private static readonly object _sigMigrationLock = new();

    public SqliteQueueRepository(IHmacProvider hmacProvider)
    {
        _hmacProvider = hmacProvider;
        BackfillKinds();
        MigrateSignaturesToV2();
    }

    /// <summary>
    /// One-time backfill of the Kind column for DelayQueue rows that predate the
    /// Kind discriminator. Must run before QueueDispatcher's first poll, since
    /// VerifyHmac permanently rejects rows whose Signature doesn't match the
    /// (now Kind-inclusive) HMAC formula.
    /// </summary>
    private void BackfillKinds()
    {
        if (_kindBackfillDone) return;
        lock (_kindBackfillLock)
        {
            if (_kindBackfillDone) return;

            using (var connection = new SqliteConnection(GetConnectionString()))
            {
                connection.Open();

                var rows = new List<(string Id, string BlockName, string TargetUrl, DateTime UnlockAt)>();
                using (var selectCmd = connection.CreateCommand())
                {
                    selectCmd.CommandText = "SELECT Id, BlockName, TargetUrl, UnlockAt FROM DelayQueue WHERE Kind = '' OR Kind IS NULL;";
                    using (var reader = selectCmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            rows.Add((
                                reader.GetString(0),
                                reader.GetString(1),
                                reader.GetString(2),
                                DateTime.Parse(reader.GetString(3), null, global::System.Globalization.DateTimeStyles.RoundtripKind)
                            ));
                        }
                    }
                }

                foreach (var row in rows)
                {
                    string kind = QueueRequestKinds.Classify(row.BlockName, row.TargetUrl);
                    var backfilled = new DelayRequest
                    {
                        Id = row.Id,
                        BlockName = row.BlockName,
                        TargetUrl = row.TargetUrl,
                        Kind = kind,
                        UnlockAt = row.UnlockAt
                    };
                    string signature = _hmacProvider.ComputeHmac(QueueSignaturePayload.BuildV2(backfilled));

                    using (var updateCmd = connection.CreateCommand())
                    {
                        updateCmd.CommandText = "UPDATE DelayQueue SET Kind = $Kind, Signature = $Signature WHERE Id = $Id;";
                        updateCmd.Parameters.AddWithValue("$Kind", kind);
                        updateCmd.Parameters.AddWithValue("$Signature", signature);
                        updateCmd.Parameters.AddWithValue("$Id", row.Id);
                        updateCmd.ExecuteNonQuery();
                    }
                }
            }

            _kindBackfillDone = true;
        }
    }

    /// <summary>
    /// One-time, idempotent reconciliation of DelayQueue signatures to the v2 format
    /// (which additionally binds BlockName). Self-checking and fail-secure:
    ///   - rows already valid under v2 are left untouched;
    ///   - rows valid under the legacy v1 formula are re-signed to v2 (in-flight delays survive);
    ///   - any other non-terminal row (Pending/Injected) is treated as tampered and failed.
    /// Safe to run on every startup — it relies on signature verification, not a persisted
    /// "migrated" flag that could be lost or tampered.
    /// </summary>
    private void MigrateSignaturesToV2()
    {
        if (_sigMigrationDone) return;
        lock (_sigMigrationLock)
        {
            if (_sigMigrationDone) return;

            using (var connection = new SqliteConnection(GetConnectionString()))
            {
                connection.Open();

                var rows = new List<DelayRequest>();
                using (var selectCmd = connection.CreateCommand())
                {
                    selectCmd.CommandText = "SELECT Id, BlockName, TargetUrl, Kind, UnlockAt, Status, Signature FROM DelayQueue;";
                    using (var reader = selectCmd.ExecuteReader())
                    {
                        while (reader.Read())
                        {
                            rows.Add(new DelayRequest
                            {
                                Id = reader.GetString(0),
                                BlockName = reader.GetString(1),
                                TargetUrl = reader.GetString(2),
                                Kind = reader.IsDBNull(3) ? "" : reader.GetString(3),
                                UnlockAt = DateTime.Parse(reader.GetString(4), null, global::System.Globalization.DateTimeStyles.RoundtripKind),
                                Status = reader.GetString(5),
                                Signature = reader.IsDBNull(6) ? "" : reader.GetString(6)
                            });
                        }
                    }
                }

                using (var transaction = connection.BeginTransaction())
                {
                    foreach (var row in rows)
                    {
                        string v2 = _hmacProvider.ComputeHmac(QueueSignaturePayload.BuildV2(row));
                        if (row.Signature == v2) continue; // already v2 — nothing to do

                        string v1 = _hmacProvider.ComputeHmac(QueueSignaturePayload.BuildV1(row));
                        if (row.Signature == v1)
                        {
                            // Legitimately signed under v1 — upgrade in place to v2.
                            using var upd = connection.CreateCommand();
                            upd.Transaction = transaction;
                            upd.CommandText = "UPDATE DelayQueue SET Signature = $Sig WHERE Id = $Id;";
                            upd.Parameters.AddWithValue("$Sig", v2);
                            upd.Parameters.AddWithValue("$Id", row.Id);
                            upd.ExecuteNonQuery();
                        }
                        else if (row.Status == QueueStatus.Pending || row.Status == QueueStatus.Injected)
                        {
                            // Matches neither format and is still live — fail secure.
                            using var upd = connection.CreateCommand();
                            upd.Transaction = transaction;
                            upd.CommandText = "UPDATE DelayQueue SET Status = $Status WHERE Id = $Id;";
                            upd.Parameters.AddWithValue("$Status", QueueStatus.FailedSecurityViolation);
                            upd.Parameters.AddWithValue("$Id", row.Id);
                            upd.ExecuteNonQuery();
                        }
                        // Terminal rows that match neither are left as-is; they are never re-processed.
                    }
                    transaction.Commit();
                }
            }

            _sigMigrationDone = true;
        }
    }

    public void AddRequest(DelayRequest request)
    {
        using (var connection = new SqliteConnection(GetConnectionString()))
        {
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = @"
                INSERT INTO DelayQueue (Id, BlockName, TargetUrl, Kind, RequestedAt, UnlockAt, Status, Signature)
                VALUES ($Id, $BlockName, $TargetUrl, $Kind, $RequestedAt, $UnlockAt, $Status, $Signature);
            ";

            string payloadToSign = QueueSignaturePayload.BuildV2(request);
            string signature = _hmacProvider.ComputeHmac(payloadToSign);

            command.Parameters.AddWithValue("$Id", request.Id);
            command.Parameters.AddWithValue("$BlockName", request.BlockName);
            command.Parameters.AddWithValue("$TargetUrl", request.TargetUrl);
            command.Parameters.AddWithValue("$Kind", request.Kind);
            command.Parameters.AddWithValue("$RequestedAt", request.RequestedAt.ToString("o"));
            command.Parameters.AddWithValue("$UnlockAt", request.UnlockAt.ToString("o"));
            command.Parameters.AddWithValue("$Status", request.Status);
            command.Parameters.AddWithValue("$Signature", signature);

            command.ExecuteNonQuery();
        }
    }
    public void BulkAddRequests(IEnumerable<DelayRequest> requests)
    {
        using (var connection = new SqliteConnection(GetConnectionString()))
        {
            connection.Open();
            using (var transaction = connection.BeginTransaction())
            {
                var command = connection.CreateCommand();
                command.Transaction = transaction;
                command.CommandText = @"
                    INSERT INTO DelayQueue (Id, BlockName, TargetUrl, Kind, RequestedAt, UnlockAt, Status, Signature)
                    VALUES ($Id, $BlockName, $TargetUrl, $Kind, $RequestedAt, $UnlockAt, $Status, $Signature);
                ";

                var idParam = command.Parameters.Add("$Id", SqliteType.Text);
                var blockParam = command.Parameters.Add("$BlockName", SqliteType.Text);
                var urlParam = command.Parameters.Add("$TargetUrl", SqliteType.Text);
                var kindParam = command.Parameters.Add("$Kind", SqliteType.Text);
                var reqAtParam = command.Parameters.Add("$RequestedAt", SqliteType.Text);
                var unlockAtParam = command.Parameters.Add("$UnlockAt", SqliteType.Text);
                var statusParam = command.Parameters.Add("$Status", SqliteType.Text);
                var sigParam = command.Parameters.Add("$Signature", SqliteType.Text);

                foreach (var req in requests)
                {
                    string payloadToSign = QueueSignaturePayload.BuildV2(req);
                    string signature = _hmacProvider.ComputeHmac(payloadToSign);

                    idParam.Value = req.Id;
                    blockParam.Value = req.BlockName;
                    urlParam.Value = req.TargetUrl;
                    kindParam.Value = req.Kind;
                    reqAtParam.Value = req.RequestedAt.ToString("o");
                    unlockAtParam.Value = req.UnlockAt.ToString("o");
                    statusParam.Value = req.Status;
                    sigParam.Value = signature;

                    command.ExecuteNonQuery();
                }
                transaction.Commit();
            }
        }
    }

    public List<DelayRequest> GetPendingRequests()
    {
        return GetRequestsByStatus(QueueStatus.Pending);
    }

    public List<DelayRequest> GetInjectedRequests()
    {
        return GetRequestsByStatus(QueueStatus.Injected);
    }

    private List<DelayRequest> GetRequestsByStatus(string status)
    {
        var requests = new List<DelayRequest>();
        using (var connection = new SqliteConnection(GetConnectionString()))
        {
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "SELECT Id, BlockName, TargetUrl, Kind, RequestedAt, UnlockAt, Status, Signature FROM DelayQueue WHERE Status = $Status ORDER BY UnlockAt ASC;";
            command.Parameters.AddWithValue("$Status", status);

            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    requests.Add(new DelayRequest
                    {
                        Id = reader.GetString(0),
                        BlockName = reader.GetString(1),
                        TargetUrl = reader.GetString(2),
                        Kind = reader.IsDBNull(3) ? "" : reader.GetString(3),
                        RequestedAt = DateTime.Parse(reader.GetString(4), null, global::System.Globalization.DateTimeStyles.RoundtripKind),
                        UnlockAt = DateTime.Parse(reader.GetString(5), null, global::System.Globalization.DateTimeStyles.RoundtripKind),
                        Status = reader.GetString(6),
                        Signature = reader.IsDBNull(7) ? "" : reader.GetString(7)
                    });
                }
            }
        }
        return requests;
    }

    public void UpdateRequestStatus(string id, string newStatus)
    {
        using (var connection = new SqliteConnection(GetConnectionString()))
        {
            connection.Open();
            var command = connection.CreateCommand();
            command.CommandText = "UPDATE DelayQueue SET Status = $Status WHERE Id = $Id;";
            command.Parameters.AddWithValue("$Status", newStatus);
            command.Parameters.AddWithValue("$Id", id);
            command.ExecuteNonQuery();
        }
    }
}


