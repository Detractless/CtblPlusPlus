using System;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading.Tasks;

namespace CtblPlusPlus.Infrastructure.System;

public class CtblCliClient
{
    private const string ExePath = @"C:\Program Files\Cold Turkey\Cold Turkey Blocker.exe";

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    private const int SW_HIDE = 0;

    public async Task StartBlock(string blockName, string? password = null)
    {
        if (!string.IsNullOrEmpty(password))
        {
            await ExecuteCommand("-start", blockName, "-password", password);
        }
        else
        {
            await ExecuteCommand("-start", blockName);
        }
    }

    public async Task StopBlock(string blockName, string password)
    {
        if (!string.IsNullOrEmpty(password))
        {
            await ExecuteCommand("-stop", blockName, "-password", password);
        }
        else
        {
            await ExecuteCommand("-stop", blockName);
        }
    }





    public void RestartService()
    {
        try
        {
            var process = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = ExePath,
                    UseShellExecute = true,
                    WindowStyle = ProcessWindowStyle.Minimized,
                    CreateNoWindow = false
                }
            };
            process.Start();
            _ = HideColdTurkeyWindowAsync(process);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error restarting Cold Turkey: {ex.Message}");
        }
    }

    public void KillService()
    {
        try
        {
            var p1 = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "taskkill",
                    Arguments = "/F /IM \"Cold Turkey Blocker.exe\" /T",
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            p1.Start();
            p1.WaitForExit();

            var p2 = new Process
            {
                StartInfo = new ProcessStartInfo
                {
                    FileName = "taskkill",
                    Arguments = "/F /IM \"CTService.exe\" /T",
                    UseShellExecute = false,
                    CreateNoWindow = true
                }
            };
            p2.Start();
            p2.WaitForExit();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error killing Cold Turkey services: {ex.Message}");
        }
    }

    public void ExecutePowershell(string script)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = $"-NoProfile -ExecutionPolicy Bypass -Command \"{script}\"",
                CreateNoWindow = true,
                UseShellExecute = false
            };
            Process.Start(psi)?.WaitForExit(5000);
        }
        catch { /* best effort */ }
    }

    private async Task HideColdTurkeyWindowAsync(Process launchedProcess)
    {
        var start = DateTime.UtcNow;
        var timeout = TimeSpan.FromSeconds(10);

        while (DateTime.UtcNow - start < timeout)
        {
            // 1. Check primary process handle
            try
            {
                launchedProcess.Refresh();
                IntPtr hwnd = launchedProcess.MainWindowHandle;
                if (hwnd != IntPtr.Zero)
                {
                    ShowWindow(hwnd, SW_HIDE);
                    return;
                }
            }
            catch { /* Process might have exited */ }

            // 2. Fallback: Name-based scan (in case it dispatched to another instance)
            var processes = Process.GetProcessesByName("Cold Turkey Blocker");
            foreach (var p in processes)
            {
                try
                {
                    IntPtr hwnd = p.MainWindowHandle;
                    if (hwnd != IntPtr.Zero)
                    {
                        ShowWindow(hwnd, SW_HIDE);
                        return;
                    }
                }
                catch { }
            }

            await Task.Delay(50);
        }
    }

    private async Task ExecuteCommand(params string[] args)
    {
        try
        {
            var startInfo = new ProcessStartInfo
            {
                FileName = ExePath,
                UseShellExecute = true, // Required for WindowStyle to be respected
                WindowStyle = ProcessWindowStyle.Minimized,
                CreateNoWindow = false // GUI apps need a window to be minimized/hidden properly
            };
            foreach (var arg in args)
            {
                startInfo.ArgumentList.Add(arg);
            }

            var process = new Process { StartInfo = startInfo };

            process.Start();
            
            // Trigger fire-and-forget hiding logic
            _ = HideColdTurkeyWindowAsync(process);
            
            // Wait up to 3 seconds for the CLI command to dispatch to the background worker and exit
            bool exited = process.WaitForExit(3000);
            
            if (!exited)
            {
                try { process.Kill(); } catch { }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error executing cold turkey CLI: {ex.Message}");
        }
    }
}


