using System.Net;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class EnqueueBlockConfigHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<EnqueueBlockConfigHandler> _logger;

        public EnqueueBlockConfigHandler(QueuedDelayService queuedDelayService, ILogger<EnqueueBlockConfigHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/blocks/enqueue-block-config";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string? blockName = request.QueryString["block"];
                string? payload = request.QueryString["payload"];

                _logger.LogInformation($"Received enqueue-block-config: block={blockName}");

                if (!string.IsNullOrEmpty(blockName) && !string.IsNullOrEmpty(payload))
                {
                    blockName = System.Net.WebUtility.UrlDecode(blockName);
                    payload = System.Net.WebUtility.UrlDecode(payload);
                    _queuedDelayService.EnqueueBlockConfigChange(blockName, payload);
                }
            }
            return Task.FromResult("{\"status\": \"success\"}");
        }
    }
}
