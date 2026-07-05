using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Models;

using CtblPlusPlus.Application.Diagnostics;

namespace CtblPlusPlus.Application.Queue.Handlers;

public class SettingsQueueHandler : IQueueRequestHandler
{
    private readonly ISettingsRepository _settingsRepo;
    private readonly IQueueRepository _queueRepo;
    private readonly IAuditRepository _auditRepo;

    public SettingsQueueHandler(ISettingsRepository settingsRepo, IQueueRepository queueRepo, IAuditRepository auditRepo)
    {
        _settingsRepo = settingsRepo;
        _queueRepo = queueRepo;
        _auditRepo = auditRepo;
    }

    public bool CanHandle(DelayRequest request)
    {
        return request.Kind == QueueRequestKinds.GlobalDelayDecrease;
    }

    public void Handle(DelayRequest request, QueueBatchContext context)
    {
        var parts = request.TargetUrl.Split('|');

        if (parts.Length < 2 || string.IsNullOrWhiteSpace(parts[1]))
        {
            _auditRepo.LogAction("System", "GlobalDelayHours", "Rejected: malformed TargetUrl â€” missing value segment");
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Rejected);
            return;
        }

        if (!double.TryParse(parts[1], System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out double parsedHours))
        {
            _auditRepo.LogAction("System", "GlobalDelayHours", $"Rejected: non-numeric value '{parts[1]}'");
            _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Rejected);
            return;
        }

        string newValue = parsedHours.ToString(System.Globalization.CultureInfo.InvariantCulture);
        _settingsRepo.SetSetting("GlobalDelayHours", newValue);
        _queueRepo.UpdateRequestStatus(request.Id, QueueStatus.Applied);
        _auditRepo.LogAction("System", "GlobalDelayHours", $"Decreased to {newValue}");
    }
}



