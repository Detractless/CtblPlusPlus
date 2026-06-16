namespace CtblPlusPlus.Core.Interfaces.Identity;

public interface IAppIdentityResolver
{
    string GetAppName(string exePath);
    string GetPublisher(string exePath);
    string GetFileHashSha256(string exePath);
    (string AppName, string Publisher, string FileHashSha256) GetIdentity(string exePath);
}
