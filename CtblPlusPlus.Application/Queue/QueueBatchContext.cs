using System;
using System.Collections.Generic;
using System.Threading;
using CtblPlusPlus.Core.Exceptions;
using CtblPlusPlus.Core.Models;
using CtblPlusPlus.Application.Interfaces;
using CtblPlusPlus.Application.AppControl;
using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue;

public class QueueBatchContext
{
    private readonly ICtblStateStore _stateStore;
    private readonly IColdTurkeyInjector _cliService;

    private CtblRoot? _cachedState;
    private bool _isLoaded;

    public bool CtblStateModified { get; private set; }
    public Dictionary<string, string> BlocksToStart { get; } = new();

    public QueueBatchContext(ICtblStateStore stateStore, IColdTurkeyInjector cliService)
    {
        _stateStore = stateStore;
        _cliService = cliService;
    }

    public CtblRoot GetCtblState()
    {
        if (_isLoaded)
        {
            return _cachedState ?? throw new InvalidOperationException("CTBL DB state could not be loaded.");
        }

        Log($"[{DateTime.UtcNow:O}] Force killing CTService before DB read...\n");
        _cliService.KillService();
        Thread.Sleep(500);

        for (int i = 0; i < 5; i++)
        {
            try
            {
                _cachedState = _stateStore.GetDbState();
                _isLoaded = true;
                return _cachedState;
            }
            catch (DatabaseLockedException)
            {
                if (i == 4) throw;
                Log($"[{DateTime.UtcNow:O}] SQLite Lock detected, retrying DB read... ({i + 1}/5)\n");
                Thread.Sleep(500);
            }
        }

        throw new InvalidOperationException("Unreachable but satisfies compiler");
    }

    public void MarkCtblModified()
    {
        CtblStateModified = true;
    }

    public void RequestBlockRestart(string blockName)
    {
        BlocksToStart[blockName] = "CTBL_QUEUED_DELAY";
    }

    public void Log(string message)
    {
        EngineLogger.Log("QueueBatch", message);
    }
}


