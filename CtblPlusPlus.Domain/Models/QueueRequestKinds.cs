using System.Collections.Generic;

namespace CtblPlusPlus.Core.Models;

public static class QueueRequestKinds
{
    public const string QueuedDelayUnlock = "QueuedDelayUnlock";
    public const string GlobalDelayDecrease = "GlobalDelayDecrease";
    public const string AppAllow = "AppAllow";
    public const string AppRevoke = "AppRevoke";
    public const string AppRevokePath = "AppRevokePath";
    public const string AppEnableControl = "AppEnableControl";
    public const string AppDisableControl = "AppDisableControl";
    public const string WebsiteException = "WebsiteException";
    public const string BlockConfigChange = "BlockConfigChange";
    public const string ScheduleChange = "ScheduleChange";

    public static readonly HashSet<string> AppControlKinds = new()
    {
        AppAllow,
        AppRevoke,
        AppRevokePath,
        AppEnableControl,
        AppDisableControl
    };

    /// <summary>
    /// Reproduces the legacy TargetUrl-based dispatch logic. Used only to backfill the
    /// Kind column for pre-existing DelayQueue rows that predate this discriminator.
    /// </summary>
    public static string Classify(string blockName, string targetUrl)
    {
        if (blockName == "System" && targetUrl.StartsWith("GlobalDelayHours|"))
            return GlobalDelayDecrease;

        if (targetUrl.StartsWith("APP_ALLOW|"))
            return AppAllow;

        if (targetUrl.StartsWith("APP_REVOKE|"))
            return AppRevoke;

        if (targetUrl.StartsWith("APP_REVOKE_PATH|"))
            return AppRevokePath;

        if (targetUrl == "APP_ENABLE_CONTROL")
            return AppEnableControl;

        if (targetUrl == "APP_DISABLE_CONTROL")
            return AppDisableControl;

        if (targetUrl == "CTBL_QUEUED_DELAY")
            return QueuedDelayUnlock;

        if (targetUrl.StartsWith("BLOCK_CONFIG|"))
            return BlockConfigChange;

        if (targetUrl.StartsWith("SCHEDULE_CHANGE|"))
            return ScheduleChange;

        return WebsiteException;
    }
}
