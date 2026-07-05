using CtblPlusPlus.Core.Models;

using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue;

public interface IQueueRequestHandler
{
    bool CanHandle(DelayRequest request);
    void Handle(DelayRequest request, QueueBatchContext context);
}



