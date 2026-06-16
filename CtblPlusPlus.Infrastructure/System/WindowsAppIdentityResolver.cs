using System;
using System.Diagnostics;
using System.IO;
using System.Security.Cryptography;
using CtblPlusPlus.Core.Interfaces.Identity;

namespace CtblPlusPlus.Infrastructure.System;

public class WindowsAppIdentityResolver : IAppIdentityResolver
{
    public string GetAppName(string exePath)
    {
        try
        {
            if (!File.Exists(exePath)) return Path.GetFileNameWithoutExtension(exePath);
            var info = FileVersionInfo.GetVersionInfo(exePath);
            return !string.IsNullOrWhiteSpace(info.ProductName)
                ? info.ProductName
                : Path.GetFileNameWithoutExtension(exePath);
        }
        catch
        {
            return Path.GetFileNameWithoutExtension(exePath);
        }
    }

    public string GetPublisher(string exePath)
    {
        try
        {
            if (!File.Exists(exePath)) return string.Empty;
            var info = FileVersionInfo.GetVersionInfo(exePath);
            return info.CompanyName ?? string.Empty;
        }
        catch
        {
            return string.Empty;
        }
    }

    public string GetFileHashSha256(string exePath)
    {
        try
        {
            if (!File.Exists(exePath)) return string.Empty;
            using var stream = new FileStream(exePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            byte[] hash = SHA256.HashData(stream);
            return Convert.ToHexString(hash);
        }
        catch
        {
            return string.Empty;
        }
    }

    public (string AppName, string Publisher, string FileHashSha256) GetIdentity(string exePath)
    {
        return (GetAppName(exePath), GetPublisher(exePath), GetFileHashSha256(exePath));
    }
}
