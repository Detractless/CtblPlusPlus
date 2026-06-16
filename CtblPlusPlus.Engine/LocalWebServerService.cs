using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using CtblPlusPlus.Engine.Api;

namespace CtblPlusPlus.Engine
{
    public class LocalWebServerService : BackgroundService
    {
        private readonly ILogger<LocalWebServerService> _logger;
        private readonly HttpListener _listener;
        private readonly string _webRoot;
        private readonly string _webRootWithSep;
        private readonly IEnumerable<IApiRouteHandler> _apiRouteHandlers;

        public LocalWebServerService(
            ILogger<LocalWebServerService> logger,
            IEnumerable<IApiRouteHandler> apiRouteHandlers)
        {
            _logger = logger;
            _apiRouteHandlers = apiRouteHandlers;
            _listener = new HttpListener();
            _listener.Prefixes.Add("http://localhost:58123/");
            _listener.Prefixes.Add("http://127.0.0.1:58123/");

            _webRoot = Path.GetFullPath(@"C:\Program Files\Cold Turkey\web");
            _webRootWithSep = _webRoot.TrimEnd('\\', '/') + Path.DirectorySeparatorChar;
            _logger.LogInformation($"LocalWebServerService: Using web root: {_webRoot}");
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            try
            {
                _listener.Start();
                _logger.LogInformation("LocalWebServerService started on http://localhost:58123/ and 127.0.0.1");

                while (!stoppingToken.IsCancellationRequested)
                {
                    var context = await _listener.GetContextAsync();
                    _ = ProcessRequestAsync(context);
                }
            }
            catch (Exception ex) when (ex is HttpListenerException || ex is OperationCanceledException)
            {
                // Normal shutdown
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in LocalWebServerService");
            }
            finally
            {
                _listener.Close();
            }
        }

        private async Task ProcessRequestAsync(HttpListenerContext context)
        {
            try
            {
                var request = context.Request;
                var response = context.Response;

                // Add CORS headers to allow file:/// to fetch from localhost
                response.Headers.Add("Access-Control-Allow-Origin", "*");
                response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

                if (request.HttpMethod == "OPTIONS")
                {
                    response.StatusCode = (int)HttpStatusCode.OK;
                    response.Close();
                    return;
                }

                string relativePath = request.Url.LocalPath.TrimStart('/');

                if (relativePath.StartsWith("api/"))
                {
                    await ProcessApiRequestAsync(context, relativePath);
                    return;
                }

                if (string.IsNullOrEmpty(relativePath))
                {
                    relativePath = "index.html";
                }

                // Resolve the requested path and confirm it stays inside the web root.
                // Canonicalizing with GetFullPath defeats traversal tricks that a naive
                // string replace misses (e.g. a leading backslash, which Path.Combine
                // treats as drive-rooted and would otherwise escape the web root entirely).
                string filePath = Path.GetFullPath(Path.Combine(_webRoot, relativePath));
                if (!filePath.StartsWith(_webRootWithSep, StringComparison.OrdinalIgnoreCase))
                {
                    response.StatusCode = (int)HttpStatusCode.Forbidden;
                    return;
                }

                if (File.Exists(filePath))
                {
                    byte[] fileBytes = await File.ReadAllBytesAsync(filePath);

                    if (filePath.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
                        response.ContentType = "text/html; charset=utf-8";
                    else if (filePath.EndsWith(".js", StringComparison.OrdinalIgnoreCase))
                        response.ContentType = "application/javascript; charset=utf-8";
                    else if (filePath.EndsWith(".css", StringComparison.OrdinalIgnoreCase))
                        response.ContentType = "text/css; charset=utf-8";

                    response.StatusCode = (int)HttpStatusCode.OK;
                    response.ContentLength64 = fileBytes.Length;
                    await response.OutputStream.WriteAsync(fileBytes, 0, fileBytes.Length);
                }
                else
                {
                    response.StatusCode = (int)HttpStatusCode.NotFound;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing request");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            }
            finally
            {
                try { context.Response.Close(); } catch { }
            }
        }

        private async Task ProcessApiRequestAsync(HttpListenerContext context, string relativePath)
        {
            var request = context.Request;
            var response = context.Response;

            try
            {
                string callback = request.QueryString["callback"];
                bool isJsonp = !string.IsNullOrEmpty(callback);

                var handler = _apiRouteHandlers.FirstOrDefault(h => h.CanHandle(request.HttpMethod, relativePath, isJsonp));
                if (handler == null)
                {
                    _logger.LogWarning($"API Hit: Endpoint not found: {request.HttpMethod} {relativePath}");
                    response.StatusCode = (int)HttpStatusCode.NotFound;
                    return;
                }

                _logger.LogInformation($"API Hit: {request.HttpMethod} {relativePath}");
                string jsonResponse = await handler.HandleAsync(request, relativePath, isJsonp);

                if (isJsonp)
                {
                    jsonResponse = $"{callback}({jsonResponse});";
                    response.ContentType = "application/javascript";
                }
                else
                {
                    response.ContentType = "application/json";
                }

                byte[] buffer = System.Text.Encoding.UTF8.GetBytes(jsonResponse);
                response.StatusCode = (int)HttpStatusCode.OK;
                response.ContentLength64 = buffer.Length;
                await response.OutputStream.WriteAsync(buffer, 0, buffer.Length);
            }
            catch (HttpListenerException hlex) when (hlex.ErrorCode == 1229)
            {
                _logger.LogWarning("Client disconnected before response could be sent: {Path}", relativePath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error processing API request: {relativePath}");
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
            }
            finally
            {
                try { context.Response.Close(); } catch { }
            }
        }
    }
}
