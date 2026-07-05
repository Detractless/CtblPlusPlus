using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using CtblPlusPlus.Core.Interfaces.Data;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class QueuedDelayBlocksHandler : IApiRouteHandler
    {
        private readonly IQueueRepository _queueRepository;

        public QueuedDelayBlocksHandler(IQueueRepository queueRepository)
        {
            _queueRepository = queueRepository;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsGetOrJsonp(httpMethod, isJsonp) && relativePath == "api/blocks/queued-delay";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            var pendingRequests = _queueRepository.GetPendingRequests();
            var activeDelays = pendingRequests
                .Where(r => r.TargetUrl == "CTBL_QUEUED_DELAY")
                .Select(r => new { r.BlockName, r.UnlockAt, r.RequestedAt })
                .ToList();
            return Task.FromResult(JsonSerializer.Serialize(activeDelays));
        }
    }
}
