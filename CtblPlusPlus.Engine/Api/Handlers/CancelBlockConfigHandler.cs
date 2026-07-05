using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class CancelBlockConfigHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;
        private readonly ILogger<CancelBlockConfigHandler> _logger;

        public CancelBlockConfigHandler(QueuedDelayService queuedDelayService, ILogger<CancelBlockConfigHandler> logger)
        {
            _queuedDelayService = queuedDelayService;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/blocks/cancel-block-config";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                string? blockName = request.QueryString["block"];
                if (!string.IsNullOrEmpty(blockName))
                {
                    blockName = System.Net.WebUtility.UrlDecode(blockName);
                    var result = _queuedDelayService.CancelBlockConfigChange(blockName);
                    return Task.FromResult(JsonSerializer.Serialize(new { status = result.Cancelled ? "cancelled" : "none" }));
                }
            }
            return Task.FromResult(JsonSerializer.Serialize(new { status = "none" }));
        }
    }
}
