using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CtblPlusPlus.Application.Interfaces;
using CtblPlusPlus.Core.Models;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Interfaces.Security;
using CtblPlusPlus.Application.AppControl;
using CtblPlusPlus.Application.Queue.Handlers;
using CtblPlusPlus.Application.Diagnostics;
using Microsoft.Extensions.Hosting;

namespace CtblPlusPlus.Application.Queue;

public class QueueDispatcher : BackgroundService
{
    private readonly IQueueRepository _queueRepo;
    private readonly ICtblStateStore _stateStore;
    private readonly IColdTurkeyInjector _ctInjector;
    private readonly IEnumerable<IQueueRequestHandler> _handlers;
    private readonly QueueSecurityValidator _securityValidator;
    private readonly WebsiteTamperRemediator _tamperRemediator;

    private readonly TimeSpan _pollInterval = TimeSpan.FromSeconds(5);

    public QueueDispatcher(
        IQueueRepository queueRepo,
        ICtblStateStore stateStore,
        IColdTurkeyInjector ctInjector,
        IEnumerable<IQueueRequestHandler> handlers,
        QueueSecurityValidator securityValidator,
        WebsiteTamperRemediator tamperRemediator)
    {
        _queueRepo = queueRepo;
        _stateStore = stateStore;
        _ctInjector = ctInjector;
        _handlers = handlers;
        _securityValidator = securityValidator;
        _tamperRemediator = tamperRemediator;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await ProcessingLoopAsync(stoppingToken);
    }

    private async Task ProcessingLoopAsync(CancellationToken cancellationToken)
    {
        try
        {
            await ProcessQueueAsync();
        }
        catch (Exception ex)
        {
            EngineLogger.Log("QueueDispatcher", $"Error during initial queue processing: {ex.Message}");
        }

        using var timer = new PeriodicTimer(_pollInterval);

        while (await timer.WaitForNextTickAsync(cancellationToken))
        {
            try
            {
                await ProcessQueueAsync();
            }
            catch (Exception ex)
            {
                EngineLogger.Log("QueueDispatcher", $"Error processing queue: {ex.Message}");
            }
        }
    }

    private async Task ProcessQueueAsync()
    {
        var context = new QueueBatchContext(_stateStore, _ctInjector);

        try
        {
            _tamperRemediator.Rollback(context);

            var pendingRequests = _queueRepo.GetPendingRequests();
            if (!pendingRequests.Any()) return;

            var now = DateTime.UtcNow;
            var dueRequests = pendingRequests.Where(r => r.UnlockAt <= now).ToList();
            if (!dueRequests.Any()) return;

            context.Log($"[{now:O}] Found {dueRequests.Count} due requests.\n");

            foreach (var req in dueRequests)
            {
                context.Log($"[{DateTime.UtcNow:O}] Processing Req '{req.TargetUrl}' | unlockAt={req.UnlockAt:O}\n");

                if (!_securityValidator.VerifyHmac(req, context)) continue;

                var handler = _handlers.FirstOrDefault(h => h.CanHandle(req));
                if (handler != null)
                {
                    handler.Handle(req, context);
                }
                else
                {
                    context.Log($"[{DateTime.UtcNow:O}] No handler found for Req '{req.TargetUrl}'\n");
                }
            }

            // Unified Flush Step
            if (context.CtblStateModified)
            {
                var stateToSave = context.GetCtblState();
                _stateStore.SaveDbState(stateToSave);
                await Task.Delay(500);
            }

            foreach (var kvp in context.BlocksToStart)
            {
                await _ctInjector.StartBlock(kvp.Key, kvp.Value);
            }

        }
        catch (Exception ex)
        {
            context.Log($"[{DateTime.UtcNow:O}] FATAL EXCEPTION in ProcessQueue: {ex}\n");
        }
    }
}


