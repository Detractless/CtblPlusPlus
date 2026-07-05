using System;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.AppControl;
using CtblPlusPlus.Core.Interfaces.Data;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class AppControlHandler : IApiRouteHandler
    {
        private readonly IAppControlRepository _appRepo;
        private readonly ISettingsRepository _settingsRepo;
        private readonly AppControlQueueHandler _appControlHandler;
        private readonly ILogger<AppControlHandler> _logger;

        public AppControlHandler(
            IAppControlRepository appRepo,
            ISettingsRepository settingsRepo,
            AppControlQueueHandler appControlHandler,
            ILogger<AppControlHandler> logger)
        {
            _appRepo = appRepo;
            _settingsRepo = settingsRepo;
            _appControlHandler = appControlHandler;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/app-control";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            string? action = request.QueryString["action"];

            if (string.IsNullOrEmpty(action))
            {
                return Task.FromResult(GetAppControlData());
            }

            switch (action)
            {
                case "allow":
                    return Task.FromResult(HandleAllow(request.QueryString["path"]));
                case "revoke":
                    return Task.FromResult(HandleRevoke(request.QueryString["id"]));
                case "bulk-allow":
                    return Task.FromResult(HandleBulkAllow(request.QueryString["ids"]));
                case "bulk-revoke":
                    return Task.FromResult(HandleBulkRevoke(request.QueryString["ids"]));
                case "enable":
                    return Task.FromResult(HandleEnable());
                case "disable":
                    return Task.FromResult(HandleDisable());
                default:
                    return Task.FromResult("{\"status\":\"error\",\"message\":\"Unknown action\"}");
            }
        }

        private string GetAppControlData()
        {
            bool enabled = _settingsRepo.GetSetting("AppControlEnabled", "false") == "true";
            var apps = _appRepo.GetAllApps();

            var response = new
            {
                enabled = enabled,
                apps = apps.Select(a => new
                {
                    id = a.Id,
                    exePath = a.ExePath,
                    displayName = a.DisplayName,
                    publisher = a.Publisher,
                    status = a.Status,
                    firstSeenUtc = a.FirstSeenUtc
                }).OrderBy(a => a.displayName.ToLowerInvariant()).ToArray()
            };

            return JsonSerializer.Serialize(response);
        }

        private string HandleAllow(string? appPath)
        {
            if (string.IsNullOrEmpty(appPath))
                return "{\"status\":\"error\",\"message\":\"Missing path parameter\"}";

            try
            {
                _appControlHandler.HandleAllow(appPath);
                _logger.LogInformation("App allowed via API: {Path}", appPath);
                return "{\"status\":\"success\"}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to allow app: {Path}", appPath);
                return "{\"status\":\"error\",\"message\":\"" + JsonEncodedText.Encode(ex.Message) + "\"}";
            }
        }

        private string HandleRevoke(string? appId)
        {
            if (string.IsNullOrEmpty(appId))
                return "{\"status\":\"error\",\"message\":\"Missing id parameter\"}";

            try
            {
                _appControlHandler.HandleRevoke(appId);
                _logger.LogInformation("App revoked via API: {Id}", appId);
                return "{\"status\":\"success\"}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to revoke app: {Id}", appId);
                return "{\"status\":\"error\",\"message\":\"" + JsonEncodedText.Encode(ex.Message) + "\"}";
            }
        }

        private string HandleEnable()
        {
            try
            {
                _appControlHandler.HandleEnable();
                _logger.LogInformation("App Control enabled via API");
                return "{\"status\":\"success\"}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to enable App Control");
                return "{\"status\":\"error\",\"message\":\"" + JsonEncodedText.Encode(ex.Message) + "\"}";
            }
        }

        private string HandleBulkAllow(string? idsParam)
        {
            if (string.IsNullOrEmpty(idsParam))
                return "{\"status\":\"error\",\"message\":\"Missing ids parameter\"}";

            var ids = idsParam.Split('|', StringSplitOptions.RemoveEmptyEntries);
            _logger.LogInformation("Bulk allow queued for {Count} apps via API", ids.Length);
            Task.Run(() =>
            {
                try { _appControlHandler.HandleBulkAllow(ids); }
                catch (Exception ex) { _logger.LogError(ex, "Background bulk allow failed"); }
            });
            return "{\"status\":\"success\"}";
        }

        private string HandleBulkRevoke(string? idsParam)
        {
            if (string.IsNullOrEmpty(idsParam))
                return "{\"status\":\"error\",\"message\":\"Missing ids parameter\"}";

            var ids = idsParam.Split('|', StringSplitOptions.RemoveEmptyEntries);
            _logger.LogInformation("Bulk revoke queued for {Count} apps via API", ids.Length);
            Task.Run(() =>
            {
                try { _appControlHandler.HandleBulkRevoke(ids); }
                catch (Exception ex) { _logger.LogError(ex, "Background bulk revoke failed"); }
            });
            return "{\"status\":\"success\"}";
        }

        private string HandleDisable()
        {
            try
            {
                _appControlHandler.HandleDisable();
                _logger.LogInformation("App Control disabled via API");
                return "{\"status\":\"success\"}";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to disable App Control");
                return "{\"status\":\"error\",\"message\":\"" + JsonEncodedText.Encode(ex.Message) + "\"}";
            }
        }
    }
}
