using System;
using System.Collections.Generic;
using System.Text.Json;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Models;
using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue.Handlers;

public class ScheduleChangeQueueHandler : IQueueRequestHandler
{
    private readonly IQueueRepository _queueRepo;
    private readonly IAuditRepository _auditRepo;

    public ScheduleChangeQueueHandler(IQueueRepository queueRepo, IAuditRepository auditRepo)
    {
        _queueRepo = queueRepo;
        _auditRepo = auditRepo;
    }

    public bool CanHandle(DelayRequest request)
    {
        return request.Kind == QueueRequestKinds.ScheduleChange;
    }

    public void Handle(DelayRequest request, QueueBatchContext context)
    {
        CtblRoot currentState;
        try
        {
            currentState = context.GetCtblState();
        }
        catch (Exception ex)
        {
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedCtblDbUnavailable);
            _auditRepo.LogAction(request.BlockName, request.TargetUrl, "Failed: CTBL Database is missing or locked");
            context.Log($"[{DateTime.UtcNow:O}] ScheduleChangeQueueHandler failed to load CTBL DB: {ex.Message}\n");
            return;
        }

        if (!currentState.Blocks.TryGetValue(request.BlockName, out var block))
        {
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedBlockNotFound);
            _auditRepo.LogAction(request.BlockName, request.TargetUrl, "Failed: block not found");
            return;
        }

        string json = request.TargetUrl.Substring(QueueCommandPrefixes.ScheduleChange.Length);
        JsonDocument doc;
        try
        {
            doc = JsonDocument.Parse(json);
        }
        catch (Exception ex)
        {
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Rejected);
            _auditRepo.LogAction(request.BlockName, request.TargetUrl, $"Rejected: malformed JSON payload — {ex.Message}");
            return;
        }

        var root = doc.RootElement;

        if (root.TryGetProperty("type", out var typeEl))
            block.Type = typeEl.GetString() ?? block.Type;

        if (root.TryGetProperty("schedule", out var schedEl))
        {
            var schedList = new List<object>();
            foreach (var item in schedEl.EnumerateArray())
                schedList.Add(JsonSerializer.Deserialize<object>(item.GetRawText())!);
            block.Schedule = schedList;
        }

        if (root.TryGetProperty("autostart", out var autoEl))
            block.Autostart = autoEl.GetString() ?? block.Autostart;

        if (root.TryGetProperty("startTime", out var stEl))
            block.StartTime = stEl.GetString() ?? block.StartTime;

        if (root.TryGetProperty("enabled", out var enEl))
            block.Enabled = enEl.GetString() ?? block.Enabled;

        // Mirror CT's own side-effects when switching block type
        if (block.Type == "scheduled")
            block.Break = "none";

        if (block.Type == "continuous")
        {
            if (block.Autostart == "schedule")
                block.Autostart = "none";
            if (block.Lock.StartsWith("schedule"))
                block.Lock = "none";
        }

        context.MarkCtblModified();
        _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Injected);
        _auditRepo.LogAction(request.BlockName, "ScheduleChange", "Applied queued schedule change");

        if (block.Enabled == "true")
            context.RequestBlockRestart(request.BlockName);
    }
}
