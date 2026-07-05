@echo off
setlocal enabledelayedexpansion

:: ================================================================
::  CTBL++ v0.0.0.2 — Build / Manage
:: ================================================================

set "ROOT=%~dp0"

:menu
echo.
echo  ================================================
echo   CTBL++ v0.0.0.2
echo  ================================================
echo   [1] Build           -- compile all projects
echo   [2] Installer       -- launch the Installer
echo   [3] Engine          -- launch Engine in console mode
echo   [4] Publish         -- single-file release build
echo   [5] Split / Combine -- manage private source files
echo   [6] Clean           -- remove bin\obj for GitHub
echo   [0] Exit
echo  ================================================
echo.
set /p choice="  Select option: "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto launch_installer
if "%choice%"=="3" goto launch_engine
if "%choice%"=="4" goto publish_installer
if "%choice%"=="5" goto split_combine_menu
if "%choice%"=="6" goto clean
if "%choice%"=="0" exit /b 0
echo  Invalid option.
goto menu

:: ================================================================
:build
:: ================================================================
echo.
echo  [BUILD] Building all projects...
echo.

echo  [1/5] CtblPlusPlus.Engine...
dotnet publish "%ROOT%CtblPlusPlus.Engine\CtblPlusPlus.Engine.csproj" -c Debug -o "%ROOT%_payload" --nologo -v quiet
if %errorlevel% neq 0 (
    echo  FAILED: Engine
    pause
    goto menu
)

echo  [2/5] CtblPlusPlus.Wd1...
dotnet publish "%ROOT%CtblPlusPlus.Wd1\CtblPlusPlus.Wd1.csproj" -c Debug -o "%ROOT%_payload" --nologo -v quiet
if %errorlevel% neq 0 (
    echo  FAILED: Wd1
    pause
    goto menu
)

echo  [3/5] CtblPlusPlus.Wd2...
dotnet publish "%ROOT%CtblPlusPlus.Wd2\CtblPlusPlus.Wd2.csproj" -c Debug -o "%ROOT%_payload" --nologo -v quiet
if %errorlevel% neq 0 (
    echo  FAILED: Wd2
    pause
    goto menu
)

echo         Packaging Payload.zip for Installer...
if exist "%ROOT%CtblPlusPlus.Installer\Payload.zip" del "%ROOT%CtblPlusPlus.Installer\Payload.zip"
powershell -NoProfile -Command "Compress-Archive -Path '%ROOT%_payload\*' -DestinationPath '%ROOT%CtblPlusPlus.Installer\Payload.zip' -Force"
if %errorlevel% neq 0 (
    echo  FAILED: Payload.zip creation
    pause
    goto menu
)
rmdir /s /q "%ROOT%_payload" >nul 2>&1
echo         Payload.zip updated.

echo  [4/5] CtblPlusPlus.WebUI (patched Cold Turkey UI via webpack)...
pushd "%ROOT%CtblPlusPlus.WebUI\web\Scripts"

:: Node.js / npm must be on PATH to build the patched web UI.
where npm >nul 2>&1
if errorlevel 1 (
    echo  FAILED: npm not found on PATH. Install Node.js from https://nodejs.org/ then re-run.
    popd
    pause
    goto menu
)

:: First run - or a partial node_modules - has no webpack, so install deps if missing.
if not exist "node_modules\.bin\webpack.cmd" (
    echo         Web UI dependencies missing - installing with "npm install"...
    call npm install
    if errorlevel 1 (
        echo  FAILED: npm install ^(could not install Web UI dependencies^)
        popd
        pause
        goto menu
    )
    echo         Dependencies installed.
)

call npm run build
if errorlevel 1 (
    echo  FAILED: Web UI build ^(try deleting CtblPlusPlus.WebUI\web\Scripts\node_modules, then re-run^)
    popd
    pause
    goto menu
)
popd
echo         Packaging WebPayload.zip for Installer...
if exist "%ROOT%CtblPlusPlus.Installer\WebPayload.zip" del "%ROOT%CtblPlusPlus.Installer\WebPayload.zip"
powershell -NoProfile -Command "Compress-Archive -Path '%ROOT%CtblPlusPlus.WebUI\web\Bundled\*' -DestinationPath '%ROOT%CtblPlusPlus.Installer\WebPayload.zip' -Force"
if %errorlevel% neq 0 (
    echo  FAILED: WebPayload.zip creation
    pause
    goto menu
)
echo         WebPayload.zip updated.

echo  [5/5] CtblPlusPlus.Installer...
dotnet build "%ROOT%CtblPlusPlus.Installer\CtblPlusPlus.Installer.csproj" -c Debug --nologo -v quiet
if %errorlevel% neq 0 (
    echo  FAILED: Installer
    pause
    goto menu
)

echo.
echo  BUILD SUCCEEDED — Engine + Wd1 + Wd2 + WebUI + Installer.
echo  (Payload.zip = backend services; WebPayload.zip = patched Cold Turkey UI; both embedded in the Installer.)
echo.
pause
goto menu

:: ================================================================
:launch_installer
:: ================================================================
echo.
echo  Launching Installer...
set "INSTALLER_EXE=%ROOT%CtblPlusPlus.Installer\bin\Debug\net10.0-windows\CtblPlusPlus.Installer.exe"
if not exist "%INSTALLER_EXE%" (
    echo  Installer not built yet. Run [1] Build first.
    pause
    goto menu
)
start "" "%INSTALLER_EXE%"
goto menu

:: ================================================================
:launch_engine
:: ================================================================
echo.
echo  Launching Engine in console mode...
echo  (Press Ctrl+C to stop)
echo.
set "ENGINE_EXE=%ROOT%CtblPlusPlus.Engine\bin\Debug\net10.0-windows\CtblPlusPlus.Engine.exe"
if not exist "%ENGINE_EXE%" (
    echo  Engine not built yet. Run [1] Build first.
    pause
    goto menu
)
"%ENGINE_EXE%"
pause
goto menu

:: ================================================================
:publish_installer
:: ================================================================
echo.
echo  [PUBLISH] Building single-file self-contained installer...
echo  (Run [1] Build first so Payload.zip / WebPayload.zip are current — they are embedded.)
echo.
dotnet publish "%ROOT%CtblPlusPlus.Installer\CtblPlusPlus.Installer.csproj" -p:PublishProfile=SingleFile --nologo
if %errorlevel% neq 0 (
    echo  FAILED: Publish
    pause
    goto menu
)
echo.
echo  PUBLISH SUCCEEDED — single exe at:
echo    %ROOT%CtblPlusPlus.Installer\bin\Publish\CtblPlusPlus.Installer.exe
echo.
pause
goto menu

:: ================================================================
:clean
:: ================================================================
echo.
echo  [CLEAN] Removing bin\ and obj\ from the .NET projects for GitHub...
echo  (CtblPlusPlus.WebUI is left untouched.)
echo.
pushd "%ROOT%"
for %%P in (
    CtblPlusPlus.Application
    CtblPlusPlus.Domain
    CtblPlusPlus.Engine
    CtblPlusPlus.Infrastructure
    CtblPlusPlus.Installer
    CtblPlusPlus.Wd1
    CtblPlusPlus.Wd2
) do (
    echo    %%P
    if exist "%%P\bin" rmdir /s /q "%%P\bin"
    if exist "%%P\obj" rmdir /s /q "%%P\obj"
)
popd
echo.
echo  CLEAN COMPLETE — bin\ and obj\ removed from all 7 .NET projects.
echo.
pause
goto menu

:: ================================================================
:split_combine_menu
:: ================================================================
echo.
echo  ================================================
echo   Split / Combine
echo  ================================================
echo   [1] Split   -- export private source to Place_Me_In_Root_of_CtblPlusPlus-Main\
echo   [2] Combine -- import private source from Place_Me_In_Root_of_CtblPlusPlus-Main\
echo   [0] Back
echo  ================================================
echo.
set /p sc_choice="  Select option: "

if "%sc_choice%"=="1" goto split
if "%sc_choice%"=="2" goto combine
if "%sc_choice%"=="0" goto menu
echo  Invalid option.
goto split_combine_menu

:: ================================================================
:split
:: ================================================================
echo.
echo  [SPLIT] This will copy all private source files into Place_Me_In_Root_of_CtblPlusPlus-Main\
echo  (one level up from this folder), then DELETE them from this tree.
echo.
echo  After Split:
echo    - Push Place_Me_In_Root_of_CtblPlusPlus-Main\ to the private GitHub repo.
echo    - Push this folder to the public GitHub repo.
echo    - To resume dev work, place Place_Me_In_Root_of_CtblPlusPlus-Main\ in
echo      this project root and run Combine.
echo.
set /p confirm="  Type YES to proceed: "
if /i not "%confirm%"=="YES" (
    echo  Cancelled.
    pause
    goto menu
)

set "PRIV=%ROOT%..\Place_Me_In_Root_of_CtblPlusPlus-Main"

echo.
echo  Copying private files to %PRIV%...

set "FILES=CtblPlusPlus.Domain\Models\AppControlConstants.cs CtblPlusPlus.Domain\Security\QueueSignaturePayload.cs CtblPlusPlus.Application\Queue\QueueSecurityValidator.cs CtblPlusPlus.Application\Queue\WebsiteTamperRemediator.cs CtblPlusPlus.Infrastructure\Communication\PidBroker.cs CtblPlusPlus.Infrastructure\Security\DpapiHmacProvider.cs CtblPlusPlus.Infrastructure\Security\InstallManifest.cs CtblPlusPlus.Infrastructure\Security\VaultRecoveryService.cs CtblPlusPlus.Infrastructure\Security\WatchdogHeartbeat.cs CtblPlusPlus.Infrastructure\Security\Lockdown\AclHelper.cs CtblPlusPlus.Infrastructure\Security\Lockdown\BinaryFileLockService.cs CtblPlusPlus.Infrastructure\Security\Lockdown\FileSystemWatchdogService.cs CtblPlusPlus.Infrastructure\Security\Lockdown\IntegrityVerificationService.cs CtblPlusPlus.Infrastructure\Security\Lockdown\LockdownConstants.cs CtblPlusPlus.Infrastructure\Security\Lockdown\ScorchedEarthPurgeService.cs CtblPlusPlus.Infrastructure\Security\Lockdown\VaultAclEnforcementService.cs CtblPlusPlus.Infrastructure\Enforcers\AccountEnforcer.cs CtblPlusPlus.Infrastructure\Enforcers\BrowserEnforcer.cs CtblPlusPlus.Infrastructure\Enforcers\FactoryResetEnforcer.cs CtblPlusPlus.Infrastructure\Enforcers\PersistenceEnforcer.cs CtblPlusPlus.Infrastructure\Enforcers\PrivilegeEnforcer.cs CtblPlusPlus.Infrastructure\Enforcers\TaskManagerEnforcer.cs CtblPlusPlus.Infrastructure\Enforcers\TimeEnforcer.cs CtblPlusPlus.Infrastructure\Enforcers\UninstallerEnforcer.cs CtblPlusPlus.Infrastructure\System\NativeMethods.cs CtblPlusPlus.Infrastructure\System\WindowsServiceMonitor.cs CtblPlusPlus.Infrastructure\System\WindowsSystemEnforcementService.cs CtblPlusPlus.Engine\Program.cs CtblPlusPlus.Wd1\Program.cs CtblPlusPlus.Wd2\Program.cs CtblPlusPlus.Installer\InstallationOrchestrator.cs"

for %%F in (%FILES%) do (
    set "SRC=%ROOT%%%F"
    set "DST=%PRIV%\%%F"
    for %%D in ("!DST!") do (
        if not exist "%%~dpD" mkdir "%%~dpD"
    )
    if exist "!SRC!" (
        copy /Y "!SRC!" "!DST!" >nul
    ) else (
        echo    SKIPPED ^(not found^): %%F
    )
)

echo  Copy complete. Removing private files from public tree...
echo.

for %%F in (%FILES%) do (
    if exist "%ROOT%%%F" del /f /q "%ROOT%%%F"
)
if exist "%ROOT%CtblPlusPlus.Infrastructure\Communication" rmdir /s /q "%ROOT%CtblPlusPlus.Infrastructure\Communication"
if exist "%ROOT%CtblPlusPlus.Infrastructure\Enforcers" rmdir /s /q "%ROOT%CtblPlusPlus.Infrastructure\Enforcers"

echo  SPLIT COMPLETE.
echo.
echo  Next steps:
echo    1. Push Place_Me_In_Root_of_CtblPlusPlus-Main\ to your private GitHub repo.
echo    2. Push this folder to the public GitHub repo.
echo    3. To resume dev work: place Place_Me_In_Root_of_CtblPlusPlus-Main\ in
echo       this project root, then run Combine.
echo.
pause
goto menu

:: ================================================================
:combine
:: ================================================================
echo.
set "DROP=%ROOT%Place_Me_In_Root_of_CtblPlusPlus-Main"
if not exist "%DROP%" (
    echo  [!] Folder not found:
    echo      %DROP%
    echo.
    echo  Place the private source folder as "Place_Me_In_Root_of_CtblPlusPlus-Main"
    echo  inside this project root, then try again.
    echo.
    pause
    goto split_combine_menu
)

echo  [COMBINE] Copying private source files from
echo    %DROP%
echo  into the project tree...
echo.

for %%P in (
    CtblPlusPlus.Domain
    CtblPlusPlus.Application
    CtblPlusPlus.Infrastructure
    CtblPlusPlus.Engine
    CtblPlusPlus.Wd1
    CtblPlusPlus.Wd2
    CtblPlusPlus.Installer
) do (
    if exist "%DROP%\%%P\" (
        echo  ------------------------------------------
        echo  Copying %%P...
        echo  ------------------------------------------
        robocopy "%DROP%\%%P" "%ROOT%%%P" /E /IS /IT /NJH /NJS
        if errorlevel 8 (
            echo  WARNING: Error copying %%P
        ) else (
            echo  OK: %%P done.
        )
        echo.
    ) else (
        echo  SKIPPED ^(not found^): %%P
    )
)

echo.
echo  COMBINE COMPLETE — private files are in place.
echo  Run [1] Build to compile.
echo.
pause
goto menu
