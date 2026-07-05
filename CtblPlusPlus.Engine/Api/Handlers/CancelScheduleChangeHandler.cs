using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class CancelScheduleChangeHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<CancelScheduleChangeHandler> _logger;

        public CancelScheduleChangeHandler(QueuedDelayService queuedDelayService, ILogger<CancelScheduleChangeHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/blocks/cancel-schedule-change";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string? blockName = request.QueryString["block"];
                if (!string.IsNullOrEmpty(blockName))
                {
                    blockName = System.Net.WebUtility.UrlDecode(blockName);
                    var result = _queuedDelayService.CancelScheduleChange(blockName);
                    return Task.FromResult(JsonSerializer.Serialize(new { status = result.Cancelled ? "cancelled" : "none" }));
                }
            }
            return Task.FromResult(JsonSerializer.Serialize(new { status = "none" }));
        }
    }
}
