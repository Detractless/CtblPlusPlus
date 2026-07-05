using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class ListActionQueueHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;

        public ListActionQueueHandler(QueuedDelayService queuedDelayService)
        {
            _queuedDelayService = queuedDelayService;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsGetOrJsonp(httpMethod, isJsonp) && relativePath == "api/blocks/list-queue";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            string? blockName = request.QueryString["block"];
            if (!string.IsNullOrEmpty(blockName))
            {
                blockName = System.Net.WebUtility.UrlDecode(blockName);
                var entries = _queuedDelayService.GetPendingListActions(blockName)
                    .Select(r => new { r.Id, r.BlockName, r.TargetUrl, r.UnlockAt, r.RequestedAt })
                    .ToList();
                return Task.FromResult(JsonSerializer.Serialize(entries));
            }
            return Task.FromResult("[]");
        }
    }
}
