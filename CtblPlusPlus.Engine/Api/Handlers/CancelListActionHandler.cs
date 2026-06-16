using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class CancelListActionHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<CancelListActionHandler> _logger;

        public CancelListActionHandler(QueuedDelayService queuedDelayService, ILogger<CancelListActionHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/blocks/cancel-list-action";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string requestId = request.QueryString["id"];

                _logger.LogInformation($"Received cancel-list-action: id={requestId}");

                if (!string.IsNullOrEmpty(requestId))
                {
                    var result = _queuedDelayService.CancelListAction(requestId);
                    return Task.FromResult(JsonSerializer.Serialize(new { status = result.Cancelled ? "cancelled" : "none" }));
                }
            }
            return Task.FromResult(JsonSerializer.Serialize(new { status = "none" }));
        }
    }
}
