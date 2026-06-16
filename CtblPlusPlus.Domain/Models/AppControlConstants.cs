namespace CtblPlusPlus.Core.Models;

/// <summary>
/// Shared constants for the App Control whitelist feature. Centralized so the
/// injector, queue handlers, and queued-delay service all agree on the block
/// name and the queued-delay lock sentinel.
/// </summary>
public static class AppControlConstants
{
    /// <summary>
    /// Name of the Cold Turkey block that backs the App Control whitelist.
    /// </summary>
    public const string WhitelistBlockName = "CTBL ++ Application Whitelist";

    /// <summary>
    /// Password sentinel that marks a block's lock as a CTBL++ "Queued Delay"
    /// lock. Stopping such a block requires this password, which the engine only
    /// supplies after the configured delay elapses (see QueuedDelayQueueHandler).
    /// </summary>
    public const string QueuedDelayLockPassword = "CTBL_QUEUED_DELAY";
}
