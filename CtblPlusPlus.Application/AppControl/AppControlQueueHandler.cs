using System;
using System.Linq;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Interfaces.Identity;
using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.AppControl;

/// <summary>
/// Handles App Control queue requests: Allow, Revoke, Enable, Disable.
/// Extracted from QueueDispatcher to keep that file focused on queue dispatch.
/// </summary>
public class AppControlQueueHandler
{
    private readonly IAppControlRepository _repo;
    private readonly ISettingsRepository _settingsRepo;
    private readonly IColdTurkeyInjector _injector;
    private readonly AppControlStateManager _stateManager;
    private readonly IAppIdentityResolver _identityResolver;

    public AppControlQueueHandler(
        IAppControlRepository repo,
        ISettingsRepository settingsRepo,
        IColdTurkeyInjector injector,
        AppControlStateManager stateManager,
        IAppIdentityResolver identityResolver)
    {
        _repo = repo;
        _settingsRepo = settingsRepo;
        _injector = injector;
        _stateManager = stateManager;
        _identityResolver = identityResolver;
    }

    /// <summary>
    /// Allows an application: removes it from Cold Turkey's block list
    /// and marks it as Allowed in the database.
    /// </summary>
    public void HandleAllow(string appPath)
    {
        var app = _repo.GetAllApps().FirstOrDefault(a => a.ExePath.Equals(appPath, StringComparison.OrdinalIgnoreCase));
        if (app != null)
        {
            _repo.SetAppStatus(app.Id, "Allowed");
            _repo.SetColdTurkeyInjected(app.Id, false);
        }
        else if (System.IO.File.Exists(appPath))
        {
            var (name, publisher, _) = _identityResolver.GetIdentity(appPath);
            _repo.UpsertApp(appPath, name, publisher);
            app = _repo.GetAllApps().FirstOrDefault(a => a.ExePath.Equals(appPath, StringComparison.OrdinalIgnoreCase));
            if (app != null) _repo.SetAppStatus(app.Id, "Allowed");
        }
        else
        {
            EngineLogger.Log("AppControlQueue", $"Allow skipped - not in DB and file not found: {appPath}");
            return;
        }

        _injector.RemoveApps(new[] { appPath });
        EngineLogger.Log("AppControlQueue", $"Allowed: {appPath}");
    }

    /// <summary>
    /// Revokes access for an application: re-injects it into Cold Turkey
    /// and sets its status back to Blocked.
    /// </summary>
    public void HandleRevoke(string appId)
    {
        var allApps = _repo.GetAllApps();
        var app = allApps.FirstOrDefault(a => a.Id == appId);

        if (app != null && System.IO.File.Exists(app.ExePath))
        {
            // 1. Set status to Blocked
            _repo.SetAppStatus(app.Id, "Blocked");

            // 2. Re-inject into Cold Turkey
            bool success = _injector.InjectApps(new[] { app.ExePath });
            if (success)
            {
                _repo.SetColdTurkeyInjected(app.Id, true);
            }
        }
        else if (app != null)
        {
            // File no longer exists -- just mark as Detected
            _repo.SetAppStatus(app.Id, "Detected");
        }

        EngineLogger.Log("AppControlQueue", $"Revoked: {app?.ExePath ?? appId}");
    }

    /// <summary>
    /// Revokes access for an application by its file path.
    /// </summary>
    public void HandleRevokePath(string appPath)
    {
        var app = _repo.GetAllApps().FirstOrDefault(a => a.ExePath.Equals(appPath, StringComparison.OrdinalIgnoreCase));
        if (app != null)
        {
            HandleRevoke(app.Id);
        }
        else
        {
            EngineLogger.Log("AppControlQueue", $"Revoke Path failed -- app not found in registry: {appPath}");
        }
    }


    /// <summary>
    /// Enables App Control: syncs existing detected apps.
    /// </summary>
    public void HandleEnable()
    {
        _settingsRepo.SetSetting("AppControlEnabled", "true");
        _stateManager.SyncDetectedApps();
        EngineLogger.Log("AppControlQueue", "App Control enabled.");
    }

    /// <summary>
    /// Disables App Control.
    /// </summary>
    public void HandleDisable()
    {
        _settingsRepo.SetSetting("AppControlEnabled", "false");

        // Reset all Blocked apps back to Detected so the enforcer
        // naturally clears the CT apps list on its next tick
        var blockedApps = _repo.GetAppsByStatus("Blocked");
        if (blockedApps.Any())
        {
            _repo.BulkSetAppStatus(blockedApps.Select(a => a.Id), "Detected");
            foreach (var app in blockedApps)
                _repo.SetColdTurkeyInjected(app.Id, false);
        }

        EngineLogger.Log("AppControlQueue", "App Control disabled. App statuses reset to Detected.");
    }

    /// <summary>
    /// Allows multiple applications by ID in a single Kill-Write-Restart cycle.
    /// </summary>
    public void HandleBulkAllow(string[] ids)
    {
        var pathsToRemove = new List<string>();
        foreach (var id in ids)
        {
            try
            {
                var app = _repo.GetAllApps().FirstOrDefault(a => a.Id == id);
                if (app == null) continue;

                _repo.SetAppStatus(app.Id, "Allowed");
                _repo.SetColdTurkeyInjected(app.Id, false);
                pathsToRemove.Add(app.ExePath);
            }
            catch (Exception ex)
            {
                EngineLogger.Log("AppControlQueue", $"[ERROR] Bulk allow for {id}: {ex.Message}");
            }
        }

        if (pathsToRemove.Count > 0)
        {
            _injector.RemoveApps(pathsToRemove);
            EngineLogger.Log("AppControlQueue", $"Bulk allowed {pathsToRemove.Count} apps.");
        }
    }

    /// <summary>
    /// Revokes multiple applications in a single Kill-Write-Restart cycle.
    /// </summary>
    public void HandleBulkRevoke(string[] ids)
    {
        var pathsToInject = new List<string>();
        foreach (var id in ids)
        {
            try
            {
                var app = _repo.GetAllApps().FirstOrDefault(a => a.Id == id);
                if (app == null) continue;

                if (System.IO.File.Exists(app.ExePath))
                {
                    _repo.SetAppStatus(app.Id, "Blocked");
                    pathsToInject.Add(app.ExePath);
                }
                else
                {
                    _repo.SetAppStatus(app.Id, "Detected");
                }
            }
            catch (Exception ex)
            {
                EngineLogger.Log("AppControlQueue", $"[ERROR] Bulk revoke for {id}: {ex.Message}");
            }
        }

        if (pathsToInject.Count > 0)
        {
            bool success = _injector.InjectApps(pathsToInject);
            if (success)
            {
                foreach (var path in pathsToInject)
                {
                    var app = _repo.GetAllApps()
                        .FirstOrDefault(a => a.ExePath.Equals(path, StringComparison.OrdinalIgnoreCase));
                    if (app != null) _repo.SetColdTurkeyInjected(app.Id, true);
                }
            }
            EngineLogger.Log("AppControlQueue", $"Bulk revoked {pathsToInject.Count} apps.");
        }
    }
}


