using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Models;

namespace CtblPlusPlus.Application.Queue;

public class QueuedDelayService
{
    private readonly ISettingsRepository _settingsRepo;
    private readonly IQueueRepository _queueRepo;

    public QueuedDelayService(ISettingsRepository settingsRepo, IQueueRepository queueRepo)
    {
        _settingsRepo = settingsRepo;
        _queueRepo = queueRepo;
    }

    public void EnqueueDelay(string blockName)
    {
        bool alreadyPending = _queueRepo.GetPendingRequests()
            .Any(r => r.BlockName == blockName && r.TargetUrl == "CTBL_QUEUED_DELAY");
        if (alreadyPending) return;

        string delayStr = _settingsRepo.GetSetting("GlobalDelayHours", "24");
        double.TryParse(delayStr, NumberStyles.Any, CultureInfo.InvariantCulture, out double delayHours);
        if (delayHours <= 0) delayHours = 24;

        _queueRepo.AddRequest(new DelayRequest
        {
            Id = Guid.NewGuid().ToString("N"),
            BlockName = blockName,
            TargetUrl = "CTBL_QUEUED_DELAY",
            Kind = QueueRequestKinds.QueuedDelayUnlock,
            RequestedAt = DateTime.UtcNow,
            UnlockAt = DateTime.UtcNow.AddHours(delayHours),
            Status = QueueStatus.Pending
        });
    }

    public void ToggleBlock(string blockName, bool enabled)
    {
        string currentJson = _settingsRepo.GetSetting("QueuedDelayBlocks", "[]");
        var list = JsonSerializer.Deserialize<List<string>>(currentJson) ?? new List<string>();

        if (enabled && !list.Contains(blockName))
            list.Add(blockName);
        else if (!enabled)
            list.Remove(blockName);

        _settingsRepo.SetSetting("QueuedDelayBlocks", JsonSerializer.Serialize(list));
    }

    public SetGlobalDelayResult SetGlobalDelay(int delayMinutes)
    {
        double newHours = delayMinutes / 60.0;

        string currentStr = _settingsRepo.GetSetting("GlobalDelayHours", "24");
        double.TryParse(currentStr, NumberStyles.Any, CultureInfo.InvariantCulture, out double currentHours);
        if (currentHours <= 0) currentHours = 24;

        // Increase or same: apply immediately
        if (newHours >= currentHours)
        {
            _settingsRepo.SetSetting("GlobalDelayHours", newHours.ToString(CultureInfo.InvariantCulture));
            return new SetGlobalDelayResult { Queued = false };
        }

        // Decrease: cancel any existing pending decrease, then queue the new one
        var existing = _queueRepo.GetPendingRequests()
            .Where(r => r.BlockName == "System" && r.TargetUrl.StartsWith("GlobalDelayHours|"))
            .ToList();
        foreach (var old in existing)
            _queueRepo.UpdateRequestStatus(old.Id, QueueStatus.Rejected);

        var unlockAt = DateTime.UtcNow.AddHours(currentHours);
        _queueRepo.AddRequest(new DelayRequest
        {
            Id = Guid.NewGuid().ToString("N"),
            BlockName = "System",
            TargetUrl = $"GlobalDelayHours|{newHours.ToString(CultureInfo.InvariantCulture)}",
            Kind = QueueRequestKinds.GlobalDelayDecrease,
            RequestedAt = DateTime.UtcNow,
            UnlockAt = unlockAt,
            Status = QueueStatus.Pending
        });

        return new SetGlobalDelayResult { Queued = true, UnlockAt = unlockAt };
    }

    public CancelGlobalDelayResult CancelPendingGlobalDelayDecrease()
    {
        var existing = _queueRepo.GetPendingRequests()
            .Where(r => r.BlockName == "System" && r.TargetUrl.StartsWith("GlobalDelayHours|"))
            .ToList();

        if (existing.Count == 0)
            return new CancelGlobalDelayResult { Cancelled = false };

        foreach (var pending in existing)
            _queueRepo.UpdateRequestStatus(pending.Id, QueueStatus.Rejected);

        return new CancelGlobalDelayResult { Cancelled = true };
    }

    public CancelQueuedDelayResult CancelQueuedDelay(string blockName)
    {
        var existing = _queueRepo.GetPendingRequests()
            .Where(r => r.BlockName == blockName && r.TargetUrl == "CTBL_QUEUED_DELAY")
            .ToList();

        if (existing.Count == 0)
            return new CancelQueuedDelayResult { Cancelled = false };

        foreach (var pending in existing)
            _queueRepo.UpdateRequestStatus(pending.Id, QueueStatus.Rejected);

        return new CancelQueuedDelayResult { Cancelled = true };
    }

    public void EnqueueListAction(string blockName, string url, string actionType)
    {
        string targetUrl;
        switch (actionType)
        {
            case "remove-website": targetUrl = QueueCommandPrefixes.RemoveWebsite + url; break;
            case "add-exception":  targetUrl = url; break;
            case "remove-app":
            {
                // The CT block stores apps as "file:<forward-slash path>" (see
                // ColdTurkeyInjector). Normalize here so callers (e.g. the whitelist
                // tab) can pass a raw exePath; entries already in file: form pass through.
                string appEntry = url.StartsWith("file:") ? url : "file:" + url.Replace("\\", "/");
                targetUrl = QueueCommandPrefixes.RemoveApp + appEntry;
                break;
            }
            default: return;
        }

        bool alreadyPending = _queueRepo.GetPendingRequests()
            .Any(r => r.BlockName == blockName && r.TargetUrl == targetUrl);
        if (alreadyPending) return;

        string delayStr = _settingsRepo.GetSetting("GlobalDelayHours", "24");
        double.TryParse(delayStr, NumberStyles.Any, CultureInfo.InvariantCulture, out double delayHours);
        if (delayHours <= 0) delayHours = 24;

        _queueRepo.AddRequest(new DelayRequest
        {
            Id = Guid.NewGuid().ToString("N"),
            BlockName = blockName,
            TargetUrl = targetUrl,
            Kind = QueueRequestKinds.WebsiteException,
            RequestedAt = DateTime.UtcNow,
            UnlockAt = DateTime.UtcNow.AddHours(delayHours),
            Status = QueueStatus.Pending
        });
    }

    public CancelListActionResult CancelListAction(string requestId)
    {
        var pending = _queueRepo.GetPendingRequests()
            .FirstOrDefault(r => r.Id == requestId && r.Kind == QueueRequestKinds.WebsiteException);
        if (pending == null)
            return new CancelListActionResult { Cancelled = false };

        _queueRepo.UpdateRequestStatus(requestId, QueueStatus.Rejected);
        return new CancelListActionResult { Cancelled = true };
    }

    public List<DelayRequest> GetPendingListActions(string blockName)
    {
        return _queueRepo.GetPendingRequests()
            .Where(r => r.BlockName == blockName && r.Kind == QueueRequestKinds.WebsiteException)
            .ToList();
    }
}

public record SetGlobalDelayResult
{
    public bool Queued { get; init; }
    public DateTime? UnlockAt { get; init; }
}

public record CancelGlobalDelayResult
{
    public bool Cancelled { get; init; }
}

public record CancelQueuedDelayResult
{
    public bool Cancelled { get; init; }
}

public record CancelListActionResult
{
    public bool Cancelled { get; init; }
}
