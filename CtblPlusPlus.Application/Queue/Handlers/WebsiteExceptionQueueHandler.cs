using System;
using System.Linq;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Models;

using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue.Handlers;

public class WebsiteExceptionQueueHandler : IQueueRequestHandler
{
    private readonly IQueueRepository _queueRepo;
    private readonly IAuditRepository _auditRepo;
    private readonly IAppControlRepository _appRepo;

    public WebsiteExceptionQueueHandler(IQueueRepository queueRepo, IAuditRepository auditRepo, IAppControlRepository appRepo)
    {
        _queueRepo = queueRepo;
        _auditRepo = auditRepo;
        _appRepo = appRepo;
    }

    public bool CanHandle(DelayRequest request)
    {
        return request.Kind == QueueRequestKinds.WebsiteException;
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
            context.Log($"[{DateTime.UtcNow:O}] Website handler failed to load CTBL DB: {ex.Message}\n");
            return;
        }

        if (currentState == null)
        {
             _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedCtblDbUnavailable);
             _auditRepo.LogAction(request.BlockName, request.TargetUrl, "Failed: CTBL Database is missing or locked");
             return;
        }

        if (!currentState.Blocks.TryGetValue(request.BlockName, out var block))
        {
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.FailedBlockNotFound);
            _auditRepo.LogAction(request.BlockName, request.TargetUrl, "Failed");
            return;
        }

        if (request.TargetUrl.StartsWith(QueueCommandPrefixes.RemoveWebsite))
        {
            string urlToRemove = request.TargetUrl.Substring(QueueCommandPrefixes.RemoveWebsite.Length);
            if (block.Web != null && block.Web.Contains(urlToRemove))
            {
                block.Web.Remove(urlToRemove);
                context.MarkCtblModified();
            }

            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Injected);
            _auditRepo.LogAction(request.BlockName, urlToRemove, "Removed Website");
            if (block.Enabled == "true")
                context.RequestBlockRestart(request.BlockName);
        }
        else if (request.TargetUrl.StartsWith(QueueCommandPrefixes.RemoveApp))
        {
            string appToRemove = request.TargetUrl.Substring(QueueCommandPrefixes.RemoveApp.Length);
            if (block.Apps != null && block.Apps.Contains(appToRemove))
            {
                block.Apps.Remove(appToRemove);
                context.MarkCtblModified();
            }

            // For the App Control whitelist the block's app list is reconciled every
            // tick from the AppRegistry "Blocked" set (see CtblStateEnforcer). Flip the
            // DB status to Allowed so the enforcer does not immediately re-inject the
            // app we just removed, which would silently undo the queued allow.
            if (request.BlockName == AppControlConstants.WhitelistBlockName)
            {
                string exePath = appToRemove.StartsWith("file:")
                    ? appToRemove.Substring("file:".Length).Replace("/", "\\")
                    : appToRemove;
                var app = _appRepo.GetAllApps()
                    .FirstOrDefault(a => a.ExePath.Equals(exePath, StringComparison.OrdinalIgnoreCase));
                if (app != null)
                {
                    _appRepo.SetAppStatus(app.Id, "Allowed");
                    _appRepo.SetColdTurkeyInjected(app.Id, false);
                }
            }

            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Injected);
            _auditRepo.LogAction(request.BlockName, appToRemove, "Removed App");
            if (block.Enabled == "true")
                context.RequestBlockRestart(request.BlockName);
        }
        else
        {
            if (block.Exceptions == null) block.Exceptions = new();

            if (!block.Exceptions.Contains(request.TargetUrl))
            {
                block.Exceptions.Add(request.TargetUrl);
                context.MarkCtblModified();
            }

            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Injected);
            _auditRepo.LogAction(request.BlockName, request.TargetUrl, "Injected Exception");
            if (block.Enabled == "true")
                context.RequestBlockRestart(request.BlockName);
        }
    }
}



