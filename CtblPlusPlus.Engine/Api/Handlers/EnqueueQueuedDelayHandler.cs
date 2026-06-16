using System.Net;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class EnqueueQueuedDelayHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<EnqueueQueuedDelayHandler> _logger;

        public EnqueueQueuedDelayHandler(QueuedDelayService queuedDelayService, ILogger<EnqueueQueuedDelayHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/blocks/enqueue-queued-delay";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string blockName = request.QueryString["block"];
                _logger.LogInformation($"Received payload enqueue block: {blockName}");

                if (!string.IsNullOrEmpty(blockName))
                {
                    blockName = System.Net.WebUtility.UrlDecode(blockName);
                    _queuedDelayService.EnqueueDelay(blockName);
                }
            }
            return Task.FromResult("{\"status\": \"success\"}");
        }
    }
}
