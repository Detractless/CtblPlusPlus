using System.Net;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class ToggleQueuedDelayHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<ToggleQueuedDelayHandler> _logger;

        public ToggleQueuedDelayHandler(QueuedDelayService queuedDelayService, ILogger<ToggleQueuedDelayHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/settings/toggle-queued-delay";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string blockName = request.QueryString["block"];
                string enabled = request.QueryString["enabled"];
                _logger.LogInformation($"Received payload block: {blockName}, enabled: {enabled}");

                if (!string.IsNullOrEmpty(blockName) && !string.IsNullOrEmpty(enabled))
                {
                    blockName = System.Net.WebUtility.UrlDecode(blockName);
                    _queuedDelayService.ToggleBlock(blockName, enabled.ToLower() == "true");
                }
            }
            return Task.FromResult("{\"status\": \"success\"}");
        }
    }
}
