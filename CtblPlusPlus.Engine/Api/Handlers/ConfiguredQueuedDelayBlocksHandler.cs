using System.Net;
using System.Threading.Tasks;
using CtblPlusPlus.Core.Interfaces.Data;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class ConfiguredQueuedDelayBlocksHandler : IApiRouteHandler
    {
        private readonly ISettingsRepository _settingsRepository;

        public ConfiguredQueuedDelayBlocksHandler(ISettingsRepository settingsRepository)
        {
            _settingsRepository = settingsRepository;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsGetOrJsonp(httpMethod, isJsonp) && relativePath == "api/settings/queued-delay-blocks";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            string blocksJson = _settingsRepository.GetSetting("QueuedDelayBlocks", "[]");
            return Task.FromResult(blocksJson);
        }
    }
}
