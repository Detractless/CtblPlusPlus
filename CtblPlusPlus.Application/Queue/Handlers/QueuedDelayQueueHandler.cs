using System;
using CtblPlusPlus.Application.Queue;
using CtblPlusPlus.Application.AppControl;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Models;

namespace CtblPlusPlus.Application.Queue.Handlers;

public class QueuedDelayQueueHandler : IQueueRequestHandler
{
    private readonly IQueueRepository _queueRepo;
    private readonly IColdTurkeyInjector _ctInjector;

    public QueuedDelayQueueHandler(IQueueRepository queueRepo, IColdTurkeyInjector ctInjector)
    {
        _queueRepo = queueRepo;
        _ctInjector = ctInjector;
    }

    public bool CanHandle(DelayRequest request)
    {
        return request.Kind == QueueRequestKinds.QueuedDelayUnlock;
    }

    public void Handle(DelayRequest request, QueueBatchContext context)
    {
        try
        {
            var state = context.GetCtblState();

            if (state.Blocks.TryGetValue(request.BlockName, out var block))
            {
                _ctInjector.StopBlock(request.BlockName, "CTBL_QUEUED_DELAY").GetAwaiter().GetResult();
                context.Log($"[{DateTime.UtcNow:O}] QueuedDelayQueueHandler unlocked block '{request.BlockName}' via CLI\n");
                _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Completed);
            }
            else
            {
                context.Log($"[{DateTime.UtcNow:O}] QueuedDelayQueueHandler failed to find block '{request.BlockName}'\n");
                _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedNotFound);
            }
        }
        catch (Exception ex)
        {
            context.Log($"[{DateTime.UtcNow:O}] QueuedDelayQueueHandler exception: {ex}\n");
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedException);
        }
    }
}
