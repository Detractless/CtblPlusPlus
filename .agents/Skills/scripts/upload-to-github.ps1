# upload-to-github.ps1
# Uploads a large local folder to a GitHub branch in batches of 90 files.
# Handles Windows OOM (pack-objects signal 127), index.lock conflicts, and push retries.
# Usage: powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1

$ErrorActionPreference = "Continue"

# --- CONFIGURE THESE ---
$repo         = "D:\Users\Calibro\Downloads\CtblPlusPlus-main17\CtblPlusPlus-main\CtblPlusPlus-main"
$remoteUrl    = "https://github.com/Detractless/CtblPlusPlus.git"
$branchName   = "upload-branch"
$batchSize    = 90
$maxRetries   = 8
$retryWaitSec = 12
# -----------------------

Set-Location $repo
Write-Host "=== GitHub Large Folder Upload ===" -ForegroundColor Cyan

# Fresh git init - removes any broken .git state from previous attempts
if (Test-Path ".git") { Remove-Item -Recurse -Force ".git" -Confirm:$false }
git init

# Memory-limiting config - critical on Windows to prevent pack-objects OOM crash
git config user.email "user@example.com"
git config user.name "User"
git config core.longpaths      true
git config core.autocrlf       false
git config core.compression    0
git config pack.compression    0
git config http.postBuffer     524288000
git config pack.windowMemory   "50m"
git config pack.packSizeLimit  "50m"
git config pack.threads        "1"

git remote add origin $remoteUrl
git symbolic-ref HEAD refs/heads/$branchName

# Collect all files excluding the .git directory itself
Write-Host "Scanning files..." -ForegroundColor Yellow
$allFiles = Get-ChildItem -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\.git\\' } |
    ForEach-Object { $_.FullName.Substring($repo.Length + 1).Replace('\', '/') }

$totalFiles   = $allFiles.Count
$totalBatches = [Math]::Ceiling($totalFiles / $batchSize)
Write-Host "Found $totalFiles files across $totalBatches batches of $batchSize" -ForegroundColor Green

$batchNum = 0
for ($i = 0; $i -lt $totalFiles; $i += $batchSize) {
    $batchNum++
    $end   = [Math]::Min($i + $batchSize - 1, $totalFiles - 1)
    $batch = $allFiles[$i..$end]
    Write-Host "`nBatch $batchNum / $totalBatches ($($batch.Count) files)..." -ForegroundColor Cyan

    # Remove stale lock file left behind when a previous git process crashed
    Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

    # Write paths without BOM via .NET, then feed to git add
    $tmpFile = [System.IO.Path]::GetTempFileName()
    $enc = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllLines($tmpFile, $batch, $enc)
    git add --pathspec-from-file="$tmpFile"
    $addExit = $LASTEXITCODE
    Remove-Item $tmpFile -Force -ErrorAction SilentlyContinue

    if ($addExit -ne 0) {
        Write-Host "git add failed on batch $batchNum (exit $addExit) - skipping" -ForegroundColor Red
        continue
    }

    git commit -m "Upload batch $batchNum of $totalBatches"
    $commitExit = $LASTEXITCODE
    if ($commitExit -ne 0) {
        Write-Host "git commit failed on batch $batchNum (exit $commitExit)" -ForegroundColor Red
        continue
    }

    # Push with retries - direct git push, no Start-Process, no 2>&1
    $pushed = $false
    for ($r = 1; $r -le $maxRetries; $r++) {
        git push origin $branchName
        $pushExit = $LASTEXITCODE
        if ($pushExit -eq 0) {
            Write-Host "  Pushed batch $batchNum ok on retry $r" -ForegroundColor Green
            $pushed = $true
            break
        }
        Write-Host "  Push failed exit=$pushExit retry $r of $maxRetries waiting ${retryWaitSec}s" -ForegroundColor Yellow
        Start-Sleep -Seconds $retryWaitSec
    }
    if (-not $pushed) {
        Write-Host "FAILED to push batch $batchNum after $maxRetries attempts" -ForegroundColor Red
    }

    Start-Sleep -Seconds 2
}

Write-Host "`n=== Upload complete ===" -ForegroundColor Green
Write-Host "All files are on branch: $branchName" -ForegroundColor Green
Write-Host "Next step: run github-api-merge.ps1 to merge into main" -ForegroundColor Yellow
