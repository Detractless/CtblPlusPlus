using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.AppControl;

/// <summary>
/// Background service that syncs the engine's AppControlEnabled state with the
/// CT block's actual enabled flag, and ensures the app list content stays correct.
/// </summary>
public class CtblStateEnforcer : BackgroundService
{
    private readonly IColdTurkeyInjector _injector;
    private readonly IAppControlRepository _appRepo;
    private readonly ISettingsRepository _settingsRepo;
    private readonly AppControlStateManager _stateManager;
    private readonly HashSet<string> _selfPaths;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(45);

    public CtblStateEnforcer(
        IColdTurkeyInjector injector,
        IAppControlRepository appRepo,
        ISettingsRepository settingsRepo,
        AppControlStateManager stateManager)
    {
        _injector = injector;
        _appRepo = appRepo;
        _settingsRepo = settingsRepo;
        _stateManager = stateManager;

        string baseDir = AppDomain.CurrentDomain.BaseDirectory;
        _selfPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            Path.Combine(baseDir, "CtblPlusPlus.Engine.exe"),
            Path.Combine(baseDir, "CtblPlusPlus.Wd1.exe"),
            Path.Combine(baseDir, "CtblPlusPlus.Wd2.exe")
        };
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        EngineLogger.Log("CtblStateEnforcer", "State sync and content enforcement service started (Interval: 45s).");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                // 1. Read the block's actual enabled state from CT's database
                bool blockEnabled = _injector.ReadBlockEnabled();

                // 2. Sync our internal setting to match
                _settingsRepo.SetSetting("AppControlEnabled", blockEnabled ? "true" : "false");

                // 3. If enabled, sync any newly detected apps into CT
                if (blockEnabled)
                    _stateManager.SyncDetectedApps();

                // 4. Ensure the app list content matches (only restarts CT if list drifted)
                // Filter out self-paths so the engine never appears in CT's block list
                var blockedApps = _appRepo.GetAppsByStatus("Blocked");
                var intendedPaths = blockedApps
                    .Where(a => !_selfPaths.Contains(a.ExePath))
                    .Select(a => $"file:{a.ExePath.Replace("\\", "/")}")
                    .ToList();

                _injector.ForceEnforce(intendedPaths);
            }
            catch (Exception ex)
            {
                EngineLogger.Log("CtblStateEnforcer", $"[ERROR] Enforcement check failed: {ex.Message}");
            }

            try
            {
                await Task.Delay(Interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        EngineLogger.Log("CtblStateEnforcer", "State enforcement service stopping.");
    }
}


