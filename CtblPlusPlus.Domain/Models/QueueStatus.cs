namespace CtblPlusPlus.Core.Models;

public static class QueueStatus
{
    public const string Pending = "Pending";
    public const string Injected = "Injected";
    public const string Applied = "Applied";
    public const string Completed = "Completed";
    public const string Rejected = "Rejected";
    public const string FailedSecurityViolation = "Failed - Security Violation";
    public const string FailedException = "Failed - Exception";
    public const string FailedCtblDbUnavailable = "Failed - CTBL DB Unavailable";
    public const string FailedBlockNotFound = "Failed - Block not found";
    public const string FailedNotFound = "Failed - Not Found";
}
