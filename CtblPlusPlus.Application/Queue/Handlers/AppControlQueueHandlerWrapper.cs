using System;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Application.AppControl;
using CtblPlusPlus.Core.Models;

using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue.Handlers;

public class AppControlQueueHandlerWrapper : IQueueRequestHandler
{
    private readonly AppControlQueueHandler _innerHandler;
    private readonly IQueueRepository _queueRepo;
    private readonly IAuditRepository _auditRepo;

    public AppControlQueueHandlerWrapper(AppControlQueueHandler innerHandler, IQueueRepository queueRepo, IAuditRepository auditRepo)
    {
        _innerHandler = innerHandler;
        _queueRepo = queueRepo;
        _auditRepo = auditRepo;
    }

    public bool CanHandle(DelayRequest request)
    {
        return QueueRequestKinds.AppControlKinds.Contains(request.Kind);
    }

    public void Handle(DelayRequest request, QueueBatchContext context)
    {
        try
        {
            if (request.TargetUrl.StartsWith(QueueCommandPrefixes.AppAllow))
            {
                string appPath = request.TargetUrl.Substring(QueueCommandPrefixes.AppAllow.Length);
                _innerHandler.HandleAllow(appPath);
                _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Completed);
                _auditRepo.LogAction("AppControl", appPath, "Allowed");
            }
            else if (request.TargetUrl.StartsWith(QueueCommandPrefixes.AppRevoke))
            {
                string ruleId = request.TargetUrl.Substring(QueueCommandPrefixes.AppRevoke.Length);
                _innerHandler.HandleRevoke(ruleId);
                _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Completed);
                _auditRepo.LogAction("AppControl", request.TargetUrl, "Access Revoked & Re-Blocked");
            }
            else if (request.TargetUrl.StartsWith(QueueCommandPrefixes.AppRevokePath))
            {
                string appPath = request.TargetUrl.Substring(QueueCommandPrefixes.AppRevokePath.Length);
                _innerHandler.HandleRevokePath(appPath);
                _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Completed);
                _auditRepo.LogAction("AppControl", request.TargetUrl, "Access Revoked (Path-based)");
            }
            else if (request.TargetUrl == QueueCommandPrefixes.AppEnableControl)
            {
                _innerHandler.HandleEnable();
                _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Completed);
                _auditRepo.LogAction("AppControl", "AppControl", "App Control Enabled");
            }
            else if (request.TargetUrl == QueueCommandPrefixes.AppDisableControl)
            {
                _innerHandler.HandleDisable();
                _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Completed);
                _auditRepo.LogAction("AppControl", "AppControl", "App Control Disabled");
            }
        }
        catch (Exception ex)
        {
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedException);
            _auditRepo.LogAction("AppControl", request.TargetUrl, $"Failed: {ex.Message}");
            context.Log($"[{DateTime.UtcNow:O}] AppControl queue handler exception: {ex}\n");
        }
    }
}



