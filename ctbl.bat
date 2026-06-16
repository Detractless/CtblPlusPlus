@echo off
setlocal enabledelayedexpansion

:: ================================================================
::  CTBL++ v0.2.1.2 — Build and Launch
:: ================================================================

set "ROOT=%~dp0"

:menu
echo.
echo  ================================================
echo   CTBL++ v0.2.1.2
echo  ================================================
echo   [1] Build all projects
echo   [2] Launch Installer
echo   [3] Launch Engine (console mode)
echo   [4] Publish single-file installer (Release, self-contained)
echo   [5] Clean project for GitHub (remove bin/obj)
echo   [0] Exit
echo  ================================================
echo.
set /p choice="  Select option: "

if "%choice%"=="1" goto build
if "%choice%"=="2" goto launch_installer
if "%choice%"=="3" goto launch_engine
if "%choice%"=="4" goto publish_installer
if "%choice%"=="5" goto clean
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
