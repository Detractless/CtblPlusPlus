using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class BlockConfigQueueStatusHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;

        public BlockConfigQueueStatusHandler(QueuedDelayService queuedDelayService)
        {
            _queuedDelayService = queuedDelayService;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsGetOrJsonp(httpMethod, isJsonp) && relativePath == "api/blocks/block-config-queue";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            string? blockName = request.QueryString["block"];
            if (!string.IsNullOrEmpty(blockName))
            {
                blockName = System.Net.WebUtility.UrlDecode(blockName);
                var pending = _queuedDelayService.GetPendingBlockConfigChange(blockName);
                if (pending != null)
                    return Task.FromResult(JsonSerializer.Serialize(new { pending.Id, pending.BlockName, pending.TargetUrl, pending.UnlockAt, pending.RequestedAt }));
            }
            return Task.FromResult("null");
        }
    }
}
