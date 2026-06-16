using System.Net;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class EnqueueListActionHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<EnqueueListActionHandler> _logger;

        public EnqueueListActionHandler(QueuedDelayService queuedDelayService, ILogger<EnqueueListActionHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/blocks/enqueue-list-action";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string blockName = request.QueryString["block"];
                string url = request.QueryString["url"];
                string actionType = request.QueryString["type"];

                _logger.LogInformation($"Received enqueue-list-action: block={blockName}, type={actionType}, url={url}");

                if (!string.IsNullOrEmpty(blockName) && !string.IsNullOrEmpty(url) && !string.IsNullOrEmpty(actionType))
                {
                    blockName = System.Net.WebUtility.UrlDecode(blockName);
                    url = System.Net.WebUtility.UrlDecode(url);
                    _queuedDelayService.EnqueueListAction(blockName, url, actionType);
                }
            }
            return Task.FromResult("{\"status\": \"success\"}");
        }
    }
}
