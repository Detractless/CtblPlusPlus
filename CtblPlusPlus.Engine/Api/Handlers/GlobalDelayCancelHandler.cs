using System.IO;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using CtblPlusPlus.Application.Queue;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class GlobalDelayCancelHandler : IApiRouteHandler
    {
        private readonly QueuedDelayService _queuedDelayService;

        public GlobalDelayCancelHandler(QueuedDelayService queuedDelayService)
        {
            _queuedDelayService = queuedDelayService;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/settings/global-delay/cancel";
        }

        public async Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            if (isJsonp)
            {
                var cancelResult = _queuedDelayService.CancelPendingGlobalDelayDecrease();
                return JsonSerializer.Serialize(new { status = cancelResult.Cancelled ? "cancelled" : "none" });
            }
            else
            {
                using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
                {
                    await reader.ReadToEndAsync();
                }
                return "{\"status\": \"success\"}";
            }
        }
    }
}
