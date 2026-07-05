using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using CtblPlusPlus.Core.Exceptions;
using CtblPlusPlus.Core.Models;
using CtblPlusPlus.Application.Interfaces;
using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Infrastructure.Persistence;

public class DatabaseClient : ICtblStateStore
{
    private readonly string _dbPath;
    private const string PREFIX = "CTB17";
    private const int OFFSET = 17;
    private const int MaxBackups = 5;

    public DatabaseClient()
    {
        // Default Cold Turkey Blocker data path
        _dbPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData), "Cold Turkey", "data-app.db");
    }

    /// <summary>
    /// Reads the 'settings' key from the SQLite database, decodes it, and deserializes to CtblRoot.
    /// </summary>
    public CtblRoot GetDbState()
    {
        if (!File.Exists(_dbPath))
        {
            throw new FileNotFoundException($"Cold Turkey database not found at {_dbPath}");
        }

        string? rawHexValue = null;

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _dbPath,
            Mode = SqliteOpenMode.ReadOnly
        }.ToString();

        try
        {
            using (var connection = new SqliteConnection(connectionString))
            {
                connection.Open();
                var command = connection.CreateCommand();
                command.CommandText = "SELECT value FROM settings WHERE key = 'settings';";

                using (var reader = command.ExecuteReader())
                {
                    if (reader.Read())
                    {
                        rawHexValue = reader.GetString(0);
                    }
                }
            }
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 5 || ex.SqliteErrorCode == 6)
        {
            throw new DatabaseLockedException("Cold Turkey database is locked.", ex);
        }

        if (string.IsNullOrEmpty(rawHexValue))
        {
            throw new InvalidOperationException("Could not find 'settings' key in the database.");
        }

        if (!rawHexValue.StartsWith(PREFIX))
        {
            throw new InvalidDataException("Settings value does not start with the expected prefix.");
        }

        string hexString = rawHexValue.Substring(PREFIX.Length);
        byte[] decodedBytes = DecodeHexWithOffset(hexString, OFFSET);
        string json = Encoding.UTF8.GetString(decodedBytes);

        return JsonSerializer.Deserialize<CtblRoot>(json) ?? new CtblRoot();
    }

    /// <summary>
    /// Serializes the CtblRoot to JSON, encodes it with the offset, prepends the prefix, and saves it to the database.
    /// </summary>
    public void SaveDbState(CtblRoot state)
    {
        string json = JsonSerializer.Serialize(state, new JsonSerializerOptions { WriteIndented = false });
        byte[] jsonBytes = Encoding.UTF8.GetBytes(json);
        string hexString = EncodeBytesWithOffset(jsonBytes, OFFSET);
        string finalString = PREFIX + hexString;

        // Create a timestamped safety backup of the database before overwriting Cold Turkey's state
        try
        {
            if (File.Exists(_dbPath))
            {
                string backupPath = _dbPath + $".bak.{DateTime.UtcNow:yyyyMMddHHmmss}";
                File.Copy(_dbPath, backupPath, true);
                PruneOldBackups();
            }
        }
        catch (Exception ex)
        {
            EngineLogger.Log("DatabaseClient", $"Failed to create backup: {ex.Message}");
        }

        var connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = _dbPath,
            Mode = SqliteOpenMode.ReadWrite
        }.ToString();

        try
        {
            using (var connection = new SqliteConnection(connectionString))
            {
                connection.Open();
                var command = connection.CreateCommand();
                command.CommandText = "UPDATE settings SET value = $value WHERE key = 'settings';";
                command.Parameters.AddWithValue("$value", finalString);

                int rowsAffected = command.ExecuteNonQuery();
                if (rowsAffected == 0)
                {
                    throw new InvalidOperationException("Failed to update settings in the database: no rows affected.");
                }
            }
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 5 || ex.SqliteErrorCode == 6)
        {
            throw new DatabaseLockedException("Cold Turkey database is locked.", ex);
        }
    }

    private void PruneOldBackups()
    {
        try
        {
            string dir = Path.GetDirectoryName(_dbPath)!;
            string fileName = Path.GetFileName(_dbPath);
            var oldBackups = Directory.GetFiles(dir, fileName + ".bak.*")
                .OrderByDescending(f => f)
                .Skip(MaxBackups);

            foreach (var old in oldBackups)
            {
                File.Delete(old);
            }
        }
        catch (Exception ex)
        {
            EngineLogger.Log("DatabaseClient", $"Failed to prune old backups: {ex.Message}");
        }
    }

    private byte[] DecodeHexWithOffset(string hex, int offset)
    {
        if (hex.Length % 2 != 0)
        {
            throw new ArgumentException("Hex string length must be even.");
        }

        byte[] bytes = new byte[hex.Length / 2];
        for (int i = 0; i < bytes.Length; i++)
        {
            string hexPair = hex.Substring(i * 2, 2);
            int value = Convert.ToInt32(hexPair, 16);
            int decodedValue = value - offset;
            bytes[i] = (byte)decodedValue;
        }

        return bytes;
    }

    private string EncodeBytesWithOffset(byte[] bytes, int offset)
    {
        var sb = new StringBuilder(bytes.Length * 2);
        foreach (byte b in bytes)
        {
            int encodedValue = (b + offset) % 256;
            sb.Append(encodedValue.ToString("X2"));
        }
        return sb.ToString();
    }
}

