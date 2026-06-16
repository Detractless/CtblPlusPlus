using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Application.Interfaces;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Models;

namespace CtblPlusPlus.Engine.Api.Handlers
{
    public class EnforcerSettingsHandler : IApiRouteHandler
    {
        private static readonly string[] AllowedKeys =
        {
            "Enforcer_Time_Enabled",
            "Enforcer_FactoryReset_Enabled",
            "Enforcer_TaskManager_Enabled",
            "Enforcer_Account_Enabled",
            "Enforcer_Privilege_Enabled"
        };

        private readonly ISettingsRepository _settingsRepository;
        private readonly ICtblStateStore _stateStore;
        private readonly ILogger<EnforcerSettingsHandler> _logger;

        public EnforcerSettingsHandler(
            ISettingsRepository settingsRepository,
            ICtblStateStore stateStore,
            ILogger<EnforcerSettingsHandler> logger)
        {
            _settingsRepository = settingsRepository;
            _stateStore = stateStore;
            _logger = logger;
        }

        public bool CanHandle(string httpMethod, string relativePath, bool isJsonp)
        {
            return ApiRouteMatch.IsPostOrJsonpGet(httpMethod, isJsonp) && relativePath == "api/settings/enforcers";
        }

        public Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp)
        {
            string key = request.QueryString["key"];
            string enabled = request.QueryString["enabled"];

            if (string.IsNullOrEmpty(key))
            {
                var result = new Dictionary<string, bool>();
                foreach (var k in AllowedKeys)
                {
                    result[k] = _settingsRepository.GetSetting(k, "true") == "true";
                }
                return Task.FromResult(JsonSerializer.Serialize(result));
            }

            if (!System.Array.Exists(AllowedKeys, k => k == key))
            {
                return Task.FromResult("{\"status\":\"error\",\"message\":\"Invalid enforcer key\"}");
            }

            if (string.IsNullOrEmpty(enabled) || (enabled != "true" && enabled != "false"))
            {
                return Task.FromResult("{\"status\":\"error\",\"message\":\"Invalid enabled value\"}");
            }

            if (enabled == "false" && IsAnyBlockLocked())
            {
                _logger.LogWarning("Rejected enforcer disable for {Key}: a locked block is active", key);
                return Task.FromResult("{\"status\":\"error\",\"message\":\"Cannot disable enforcer while a locked block is active\"}");
            }

            _settingsRepository.SetSetting(key, enabled);
            _logger.LogInformation("Enforcer setting updated: {Key} = {Value}", key, enabled);
            return Task.FromResult("{\"status\":\"success\"}");
        }

        private bool IsAnyBlockLocked()
        {
            CtblRoot state;
            try
            {
                state = _stateStore.GetDbState();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to read block state; treating as locked for safety");
                return true;
            }

            if (state?.Blocks == null)
                return false;

            var now = DateTime.Now;

            foreach (var kvp in state.Blocks)
            {
                var name = kvp.Key;
                var block = kvp.Value;

                if (string.IsNullOrEmpty(block.Lock) || block.Lock == "none")
                    continue;

                bool blockActive = block.Enabled == "true";

                if (!blockActive && !string.IsNullOrEmpty(block.Autostart) &&
                    block.Autostart != "none" && block.Autostart.StartsWith("time,"))
                {
                    var parts = block.Autostart.Substring(5).Split(',');
                    if (parts.Length >= 5 &&
                        int.TryParse(parts[0], out int y) &&
                        int.TryParse(parts[1], out int mo) &&
                        int.TryParse(parts[2], out int d) &&
                        int.TryParse(parts[3], out int h) &&
                        int.TryParse(parts[4], out int mi))
                    {
                        var autostartTime = new DateTime(y, mo, d, h, mi, 0);
                        if (now < autostartTime && parts.Length >= 6 && parts[5] == "true")
                            blockActive = true;
                    }
                }

                if (!blockActive)
                    continue;

                var lk = block.Lock;

                if (lk.StartsWith("password") || lk.StartsWith("spassword") ||
                    lk.StartsWith("randomText") || lk.StartsWith("delay") ||
                    lk.StartsWith("restart"))
                    return true;

                if (lk.StartsWith("schedule") || lk.StartsWith("window"))
                    return true;

                if ((name == "Frozen Turkey" || name.StartsWith("Frozen Turkey,")) &&
                    block.Timer.Contains(","))
                {
                    var tp = block.Timer.Split(',');
                    if (tp.Length >= 5 &&
                        int.TryParse(tp[0], out int ty) &&
                        int.TryParse(tp[1], out int tmo) &&
                        int.TryParse(tp[2], out int td) &&
                        int.TryParse(tp[3], out int th) &&
                        int.TryParse(tp[4], out int tmi))
                    {
                        var timerEnd = new DateTime(ty, tmo, td, th, tmi, 0);
                        if (now < timerEnd)
                            return true;
                    }
                }

                if (lk.Length > 4 && lk[4] == ',')
                {
                    var dateParts = lk.Split(',');
                    if (dateParts.Length == 5 &&
                        int.TryParse(dateParts[0], out int ly) &&
                        int.TryParse(dateParts[1], out int lmo) &&
                        int.TryParse(dateParts[2], out int ld) &&
                        int.TryParse(dateParts[3], out int lh) &&
                        int.TryParse(dateParts[4], out int lmi))
                    {
                        var lockEnd = new DateTime(ly, lmo, ld, lh, lmi, 0);
                        if (now < lockEnd)
                            return true;
                    }
                }
            }

            return false;
        }
    }
}
