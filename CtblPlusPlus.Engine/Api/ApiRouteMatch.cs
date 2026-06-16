namespace CtblPlusPlus.Engine.Api
{
    public static class ApiRouteMatch
    {
        public static bool IsGetOrJsonp(string httpMethod, bool isJsonp)
        {
            return httpMethod == "GET" || isJsonp;
        }

        public static bool IsPostOrJsonpGet(string httpMethod, bool isJsonp)
        {
            return httpMethod == "POST" || (httpMethod == "GET" && isJsonp);
        }
    }
}
