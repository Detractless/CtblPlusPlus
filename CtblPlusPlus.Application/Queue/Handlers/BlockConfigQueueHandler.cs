using System;
using System.Text.Json;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Models;
using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue.Handlers;

public class BlockConfigQueueHandler : IQueueRequestHandler
{
    private readonly IQueueRepository _queueRepo;
    private readonly IAuditRepository _auditRepo;
    private readonly ISettingsRepository _settingsRepo;

    public BlockConfigQueueHandler(IQueueRepository queueRepo, IAuditRepository auditRepo, ISettingsRepository settingsRepo)
    {
        _queueRepo = queueRepo;
        _auditRepo = auditRepo;
        _settingsRepo = settingsRepo;
    }

    public bool CanHandle(DelayRequest request)
    {
        return request.Kind == QueueRequestKinds.BlockConfigChange;
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
            context.Log($"[{DateTime.UtcNow:O}] BlockConfigQueueHandler failed to load CTBL DB: {ex.Message}\n");
            return;
        }

        if (!currentState.Blocks.TryGetValue(request.BlockName, out var block))
        {
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedBlockNotFound);
            _auditRepo.LogAction(request.BlockName, request.TargetUrl, "Failed: block not found");
            return;
        }

        string json = request.TargetUrl.Substring(QueueCommandPrefixes.BlockConfig.Length);
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

        if (root.TryGetProperty("lock", out var lockEl))
            block.Lock = lockEl.GetString() ?? block.Lock;
        if (root.TryGetProperty("password", out var passEl))
            block.Password = passEl.GetString() ?? block.Password;
        if (root.TryGetProperty("randomTextLength", out var rtEl))
            block.RandomTextLength = rtEl.GetString() ?? block.RandomTextLength;
        if (root.TryGetProperty("window", out var winEl))
            block.Window = winEl.GetString() ?? block.Window;
        if (root.TryGetProperty("lockUnblock", out var luEl))
            block.LockUnblock = luEl.GetString() ?? block.LockUnblock;
        if (root.TryGetProperty("restartUnblock", out var ruEl))
            block.RestartUnblock = ruEl.GetString() ?? block.RestartUnblock;
        if (root.TryGetProperty("break", out var brkEl))
            block.Break = brkEl.GetString() ?? block.Break;
        if (root.TryGetProperty("pomodoroTime", out var pomEl))
            block.PomodoroTime = pomEl.GetString() ?? block.PomodoroTime;
        if (root.TryGetProperty("timer", out var timerEl))
            block.Timer = timerEl.GetString() ?? block.Timer;

        // If the new lock is no longer the QD sentinel, remove the block from the
        // QueuedDelayBlocks setting so the engine stops treating it as QD-configured.
        if (block.Password != "CTBL_QUEUED_DELAY")
        {
            var currentJson = _settingsRepo.GetSetting("QueuedDelayBlocks", "[]");
            var list = JsonSerializer.Deserialize<System.Collections.Generic.List<string>>(currentJson)
                       ?? new System.Collections.Generic.List<string>();
            if (list.Remove(request.BlockName))
                _settingsRepo.SetSetting("QueuedDelayBlocks", JsonSerializer.Serialize(list));
        }

        context.MarkCtblModified();
        _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Injected);
        _auditRepo.LogAction(request.BlockName, "BlockConfigChange", "Applied queued block config change");

        if (block.Enabled == "true")
            context.RequestBlockRestart(request.BlockName);
    }
}
