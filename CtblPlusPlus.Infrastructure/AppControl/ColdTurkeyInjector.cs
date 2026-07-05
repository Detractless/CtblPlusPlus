using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using CtblPlusPlus.Application.Interfaces;
using CtblPlusPlus.Application.AppControl;
using CtblPlusPlus.Core.Exceptions;
using CtblPlusPlus.Core.Models;
using CtblPlusPlus.Application.Diagnostics;
using System.Threading;
using CtblPlusPlus.Infrastructure.Persistence;
using CtblPlusPlus.Infrastructure.System;

namespace CtblPlusPlus.Infrastructure.AppControl;

/// <summary>
/// Single-responsibility service for injecting/removing app paths
/// into Cold Turkey's data-app.db via the Kill-Rewrite-Start workflow.
/// </summary>
public class ColdTurkeyInjector : IColdTurkeyInjector
{
    private readonly DatabaseClient _DatabaseClient;
    private readonly CtblCliClient _cliService;
    private const string BlockName = AppControlConstants.WhitelistBlockName;

    public ColdTurkeyInjector(DatabaseClient DatabaseClient, CtblCliClient cliService)
    {
        _DatabaseClient = DatabaseClient;
        _cliService = cliService;
    }

    /// <summary>
    /// Adds app paths to Cold Turkey's Apps block array.
    /// Returns true on success, false if Cold Turkey is unavailable.
    /// </summary>
    public bool InjectApps(IEnumerable<string> appPaths)
    {
        var pathList = appPaths.ToList();
        if (!pathList.Any()) return true;

        return KillWriteRestart(state =>
        {
            EnsureBlockExists(state);
            bool modified = false;

            foreach (var path in pathList)
            {
                string formatted = $"file:{path.Replace("\\", "/")}";
                if (!state.Blocks[BlockName].Apps.Contains(formatted))
                {
                    state.Blocks[BlockName].Apps.Add(formatted);
                    modified = true;
                }
            }

            return modified;
        });
    }

    /// <summary>
    /// Removes app paths from Cold Turkey's Apps block array.
    /// Returns true on success, false if Cold Turkey is unavailable.
    /// </summary>
    public bool RemoveApps(IEnumerable<string> appPaths)
    {
        var pathList = appPaths.ToList();
        if (!pathList.Any()) return true;

        return KillWriteRestart(state =>
        {
            EnsureBlockExists(state);
            bool modified = false;

            foreach (var path in pathList)
            {
                string formatted = $"file:{path.Replace("\\", "/")}";
                if (state.Blocks[BlockName].Apps.Remove(formatted))
                {
                    modified = true;
                }
            }

            return modified;
        });
    }

    /// <summary>
    /// Forces an enforcement check. If the block is disabled, unlocked, or missing,
    /// or if the app list doesn't match the intended paths, it will be repaired.
    /// </summary>
    public bool ForceEnforce(IEnumerable<string> intendedPaths = null)
    {
        return KillWriteRestart(state =>
        {
            return EnsureBlockExists(state, intendedPaths);
        });
    }

    public async Task StartBlock(string blockName, string password = null)
    {
        await _cliService.StartBlock(blockName, password);
    }

    /// <summary>
    /// Stops a Cold Turkey block by name.
    /// </summary>
    public async Task StopBlock(string blockName, string password)
    {
        await _cliService.StopBlock(blockName, password);
    }

    public bool ReadBlockEnabled()
    {
        try
        {
            var state = _DatabaseClient.GetDbState();
            if (state.Blocks.TryGetValue(BlockName, out var block))
                return block.Enabled == "true";
            return false;
        }
        catch { return false; }
    }

    public void KillService()
    {
        _cliService.KillService();
    }

    /// <summary>
    /// Executes the Kill â†’ Modify â†’ Write â†’ Restart cycle.
    /// The modifier function receives the current state and returns true if it made changes.
    /// </summary>
    private bool KillWriteRestart(Func<CtblRoot, bool> modifier)
    {
        try
        {
            CtblRoot? state = null;
            bool modified = false;

            // 1. Read DB first without killing to see if we even need to act
            for (int i = 0; i < 5; i++)
            {
                try
                {
                    state = _DatabaseClient.GetDbState();
                    break;
                }
                catch (DatabaseLockedException)
                {
                    if (i == 4) throw;
                    EngineLogger.Log("ColdTurkeyInjector", $"SQLite read lock detected, retrying... ({i + 1}/5)");
                    Thread.Sleep(500);
                }
            }

            if (state == null) return false;

            modified = modifier(state);
            if (!modified)
            {
                return true; // No changes needed (already correct), return success without killing
            }

            // 2. Changes needed (Drift detected), so kill the service
            EngineLogger.Log("ColdTurkeyInjector", "State drift or content mismatch detected. Initiating repair...");
            _cliService.KillService();
            Thread.Sleep(1000); // Give it a bit more time to release locks

            // 3. Write changes
            for (int i = 0; i < 5; i++)
            {
                try
                {
                    // Re-read to ensure we have the absolute latest state after killing
                    state = _DatabaseClient.GetDbState();
                    modifier(state);

                    _DatabaseClient.SaveDbState(state);

                    _cliService.RestartService();
                    EngineLogger.Log("ColdTurkeyInjector", "Repair complete. Service restarted.");
                    return true;
                }
                catch (DatabaseLockedException)
                {
                    if (i == 4) throw;
                    EngineLogger.Log("ColdTurkeyInjector", $"SQLite write lock detected, retrying... ({i + 1}/5)");
                    Thread.Sleep(500);
                }
            }

            return false;
        }
        catch (FileNotFoundException)
        {
            EngineLogger.Log("ColdTurkeyInjector", "Cold Turkey database not found â€” skipping injection.");
            return false;
        }
        catch (Exception ex)
        {
            EngineLogger.Log("ColdTurkeyInjector", $"[ERROR] Kill-Write-Restart failed: {ex.Message}");
            return false;
        }
    }

    /// <summary>
    /// Ensures the CTBL++ Application Whitelist block exists and is correctly configured.
    /// Returns true if changes were made.
    /// </summary>
    private bool EnsureBlockExists(CtblRoot state, IEnumerable<string> intendedPaths = null)
    {
        bool modified = false;

        if (!state.Blocks.ContainsKey(BlockName))
        {
            state.Blocks[BlockName] = new CtblBlock
            {
                Enabled = "false",
                Type = "continuous",
                Lock = "none",
                Password = "",
                Exceptions = new List<string> { "file://*.*" },
                Apps = intendedPaths?.ToList() ?? new List<string>()
            };
            return true;
        }

        var block = state.Blocks[BlockName];

        // The block's lock/password are intentionally left untouched so the whitelist
        // can use whatever lock type the user sets via the Lock Editor (none, password,
        // random text, delay, window, or the CTBL++ queued-delay sentinel). The injector
        // only reconciles the Apps list; lock enforcement is handled like any other block.

        if (intendedPaths != null)
        {
            var intendedList = intendedPaths.ToList();
            if (block.Apps.Count != intendedList.Count || !block.Apps.All(intendedList.Contains))
            {
                block.Apps = intendedList;
                modified = true;
            }
        }

        return modified;
    }
}


