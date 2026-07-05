using System.Net;
using System.Threading.Tasks;

namespace CtblPlusPlus.Engine.Api
{
    public interface IApiRouteHandler
    {
        bool CanHandle(string httpMethod, string relativePath, bool isJsonp);
        Task<string> HandleAsync(HttpListenerRequest request, string relativePath, bool isJsonp);
    }
}
