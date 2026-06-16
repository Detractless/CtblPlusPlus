namespace CtblPlusPlus.Core.Models;

/// <summary>
/// Canonical HMAC payload builder for DelayQueue rows. The signing formula lives here
/// in exactly one place — every sign and verify site must call <see cref="BuildV2"/> so
/// the format can never drift between writer and reader.
/// </summary>
public static class QueueSignaturePayload
{
    // ASCII Unit Separator (0x1F). Cannot occur in a GUID id, a Kind token, a block name,
    // a TargetUrl, or an ISO-8601 ("o") timestamp, so the joined fields are unambiguous.
    // '|' is deliberately NOT used: TargetUrl already embeds '|' (e.g. "GlobalDelayHours|12").
    private const char Sep = (char)0x1F;

    /// <summary>
    /// Current signing format. Binds every enforcement-relevant field — including BlockName,
    /// which v1 omitted — with explicit delimiters.
    /// </summary>
    public static string BuildV2(DelayRequest r) =>
        string.Join(Sep, r.Id, r.Kind, r.BlockName, r.TargetUrl, r.UnlockAt.ToString("o"));

    /// <summary>
    /// Legacy signing format (delimiterless, no BlockName). Retained ONLY so the one-time
    /// signature migration can recognize rows that were validly signed under v1 and upgrade
    /// them to v2. Do not use for new signatures.
    /// </summary>
    public static string BuildV1(DelayRequest r) =>
        r.Id + r.Kind + r.TargetUrl + r.UnlockAt.ToString("o");
}
