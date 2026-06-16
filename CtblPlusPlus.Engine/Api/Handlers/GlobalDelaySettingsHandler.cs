using System.IO;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;
using CtblPlusPlus.Core.Interfaces.Data;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class GlobalDelaySettingsHandler : IApiRouteHandler
    {
        private readonly ISettingsRepository _settingsRepository;
        private readonly IQueueRepository _queueRepository;
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<GlobalDelaySettingsHandler> _logger;

        public GlobalDelaySettingsHandler(
            ISettingsRepository settingsRepository,
            IQueueRepository queueRepository,
            QueuedDelayService queuedDelayService,
            ILogger<GlobalDelaySettingsHandler> logger)
        {
            _settingsRepository = settingsRepository;
            _queueRepository = queueRepository;
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/settings/global-delay";
        }

        public async Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string delay = request.QueryString["delay"];

                if (string.IsNullOrEmpty(delay))
                {
                    // No delay param — return current value and any pending decrease
                    string currentStr = _settingsRepository.GetSetting("GlobalDelayHours", "24");
                    double.TryParse(currentStr, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double currentHours);
                    if (currentHours <= 0) currentHours = 24;

                    var pending = _queueRepository.GetPendingRequests()
                        .FirstOrDefault(r => r.BlockName == "System" && r.TargetUrl.StartsWith("GlobalDelayHours|"));

                    object pendingDecreaseData = null;
                    if (pending != null)
                    {
                        var parts = pending.TargetUrl.Split('|');
                        if (parts.Length >= 2 && double.TryParse(parts[1], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out double targetHrs))
                            pendingDecreaseData = new { targetHours = targetHrs, unlockAt = pending.UnlockAt.ToString("o") };
                    }

                    return JsonSerializer.Serialize(new { currentHours, pendingDecrease = pendingDecreaseData });
                }
                else if (int.TryParse(delay, out int delayMinutes))
                {
                    _logger.LogInformation($"Received payload delay: {delay}");
                    var result = _queuedDelayService.SetGlobalDelay(delayMinutes);
                    if (result.Queued)
                        return JsonSerializer.Serialize(new { status = "queued", unlockAt = result.UnlockAt!.Value.ToString("o") });
                    else
                        return "{\"status\":\"applied\"}";
                }
                else
                {
                    return "{\"status\":\"error\",\"message\":\"Invalid delay value\"}";
                }
            }
            else
            {
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    string body = await reader.ReadToEndAsync();
                    _logger.LogInformation($"Received payload: {body}");
                }
                return "{\"status\": \"success\"}";
            }
        }
    }
}
