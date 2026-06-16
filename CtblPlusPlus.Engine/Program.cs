using System.Threading;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using CtblPlusPlus.Infrastructure.Security;
using CtblPlusPlus.Core.Interfaces.Identity;
using CtblPlusPlus.Application.Interfaces;
using CtblPlusPlus.Application.AppControl;
using CtblPlusPlus.Application.Queue;
using CtblPlusPlus.Application.Queue.Handlers;
using CtblPlusPlus.Core.Interfaces.Security;
using CtblPlusPlus.Core.Interfaces.Data;
using CtblPlusPlus.Core.Interfaces.System;
using CtblPlusPlus.Infrastructure.Persistence;
using CtblPlusPlus.Infrastructure.Persistence.Repositories;
using CtblPlusPlus.Infrastructure.System;
using CtblPlusPlus.Infrastructure.AppControl;
using CtblPlusPlus.Infrastructure.Communication;
using CtblPlusPlus.Application.Diagnostics;
using CtblPlusPlus.Infrastructure.Security.Enforcers;
using CtblPlusPlus.Infrastructure.Security.Lockdown;
using CtblPlusPlus.Engine.Api;
using CtblPlusPlus.Engine.Api.Handlers;

bool createdNew;
using var mutex = new Mutex(true, @"Global\CtblPlusPlus.Core_Mutex_v2", out createdNew);
if (!createdNew)
{
    try
    {
        System.Diagnostics.EventLog.WriteEntry(
            "Application",
            "CTBL Engine failed to acquire Global Mutex v2. Another instance is running.",
            System.Diagnostics.EventLogEntryType.Error);
    }
    catch { }
    return;
}

var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "CTBL Queue Delay Engine";
});

// Core interfaces
builder.Services.AddSingleton<IAppIdentityResolver, WindowsAppIdentityResolver>();
builder.Services.AddSingleton<IHmacProvider, DpapiHmacProvider>();
builder.Services.AddSingleton<IQueueRepository, SqliteQueueRepository>();
builder.Services.AddSingleton<ISettingsRepository, SqliteSettingsRepository>();
builder.Services.AddSingleton<IAuditRepository, SqliteAuditRepository>();
builder.Services.AddSingleton<IAppControlRepository, SqliteAppControlRepository>();

// System services
builder.Services.AddSingleton<ITimeSource, InternetTimeSource>();
builder.Services.AddSingleton<ISystemEnforcementService, WindowsSystemEnforcementService>();
builder.Services.AddSingleton<IInstallStateProvider, ScmInstallStateProvider>();

// -- Phase 1: Lockdown-only dependencies removed --------------------
builder.Services.AddSingleton<IProcessInvoker, WindowsProcessInvoker>();
builder.Services.AddSingleton<IFileDeleter, WindowsFileDeleter>();
builder.Services.AddSingleton<WindowsServiceMonitor>();
// --------------------------------------------------------------------

// Database clients
builder.Services.AddSingleton<DatabaseClient>();
builder.Services.AddSingleton<ICtblStateStore>(sp => sp.GetRequiredService<DatabaseClient>());
builder.Services.AddSingleton<CtblCliClient>();

// App Control services
builder.Services.AddSingleton<ColdTurkeyInjector>();
builder.Services.AddSingleton<IColdTurkeyInjector>(sp => sp.GetRequiredService<ColdTurkeyInjector>());
builder.Services.AddSingleton<AppControlStateManager>();
builder.Services.AddSingleton<AppControlQueueHandler>();
builder.Services.AddSingleton<CtblStateEnforcer>();

// Queue components
builder.Services.AddSingleton<QueuedDelayService>();
builder.Services.AddSingleton<QueueDispatcher>();
builder.Services.AddSingleton<QueueSecurityValidator>();
builder.Services.AddSingleton<WebsiteTamperRemediator>();
builder.Services.AddSingleton<IQueueRequestHandler, SettingsQueueHandler>();
builder.Services.AddSingleton<IQueueRequestHandler, AppControlQueueHandlerWrapper>();
builder.Services.AddSingleton<IQueueRequestHandler, QueuedDelayQueueHandler>();
builder.Services.AddSingleton<IQueueRequestHandler, WebsiteExceptionQueueHandler>();

// API route handlers
builder.Services.AddSingleton<IApiRouteHandler, QueuedDelayBlocksHandler>();
builder.Services.AddSingleton<IApiRouteHandler, GlobalDelaySettingsHandler>();
builder.Services.AddSingleton<IApiRouteHandler, GlobalDelayCancelHandler>();
builder.Services.AddSingleton<IApiRouteHandler, ConfiguredQueuedDelayBlocksHandler>();
builder.Services.AddSingleton<IApiRouteHandler, ToggleQueuedDelayHandler>();
builder.Services.AddSingleton<IApiRouteHandler, EnqueueQueuedDelayHandler>();
builder.Services.AddSingleton<IApiRouteHandler, CancelQueuedDelayHandler>();
builder.Services.AddSingleton<IApiRouteHandler, EnqueueListActionHandler>();
builder.Services.AddSingleton<IApiRouteHandler, CancelListActionHandler>();
builder.Services.AddSingleton<IApiRouteHandler, ListActionQueueHandler>();
builder.Services.AddSingleton<IApiRouteHandler, EnforcerSettingsHandler>();
builder.Services.AddSingleton<IApiRouteHandler, AppControlHandler>();

// Hosted background workers - core
builder.Services.AddHostedService<QueueDispatcher>(sp => sp.GetRequiredService<QueueDispatcher>());
builder.Services.AddHostedService<AppDiscoveryService>();
builder.Services.AddHostedService<CtblStateEnforcer>(sp => sp.GetRequiredService<CtblStateEnforcer>());

// -- Phase 06: IntegrityVerificationService re-enabled -----------------------
builder.Services.AddHostedService<TimeEnforcer>();
builder.Services.AddHostedService<FactoryResetEnforcer>();
builder.Services.AddHostedService<TaskManagerEnforcer>();
builder.Services.AddHostedService<AccountEnforcer>();
builder.Services.AddHostedService<PrivilegeEnforcer>();
builder.Services.AddHostedService<BinaryFileLockService>();
builder.Services.AddHostedService<IntegrityVerificationService>();
builder.Services.AddHostedService<ScorchedEarthPurgeService>();
builder.Services.AddHostedService<VaultAclEnforcementService>();
builder.Services.AddHostedService<FileSystemWatchdogService>();
builder.Services.AddHostedService<BrowserEnforcer>();
builder.Services.AddHostedService<PersistenceEnforcer>();
builder.Services.AddHostedService<UninstallerEnforcer>();
// --------------------------------------------------------------------

// Communication - PidBroker is core infrastructure (watchdog PID coordination)
builder.Services.AddHostedService<PidBroker>();

// Phase 3: Local Web Server for UI
builder.Services.AddHostedService<CtblPlusPlus.Engine.LocalWebServerService>();

var host = builder.Build();
host.Run();
