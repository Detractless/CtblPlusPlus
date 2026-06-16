using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class CancelQueuedDelayHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<CancelQueuedDelayHandler> _logger;

        public CancelQueuedDelayHandler(QueuedDelayService queuedDelayService, ILogger<CancelQueuedDelayHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/blocks/cancel-queued-delay";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string blockName = request.QueryString["block"];
                _logger.LogInformation($"Received payload cancel queued delay for block: {blockName}");

                if (!string.IsNullOrEmpty(blockName))
                {
                    blockName = System.Net.WebUtility.UrlDecode(blockName);
                    var cancelResult = _queuedDelayService.CancelQueuedDelay(blockName);
                    return Task.FromResult(JsonSerializer.Serialize(new { status = cancelResult.Cancelled ? "cancelled" : "none" }));
                }
            }
            return Task.FromResult(JsonSerializer.Serialize(new { status = "none" }));
        }
    }
}
