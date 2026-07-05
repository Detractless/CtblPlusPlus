# upload-to-github.ps1
# Uploads a large local folder to a GitHub branch in batches of 90 files.
# Handles Windows OOM (pack-objects signal 127), index.lock conflicts, and push retries.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1

$ErrorActionPreference = "Continue"

# ── CONFIGURE THESE ──────────────────────────────────────────────────────────
$repo         = "C:\path\to\your\folder"              # Full path to the folder being uploaded
$remoteUrl    = "https://github.com/YourUser/YourRepo.git"
$branchName   = "upload-branch"                        # New branch (NOT main)
$batchSize    = 90                                     # Files per commit — keep at or below 90
$maxRetries   = 8                                      # Push retry attempts per batch
$retryWaitSec = 12                                     # Seconds between retries
# ─────────────────────────────────────────────────────────────────────────────

Set-Location $repo
Write-Host "=== GitHub Large Folder Upload ===" -ForegroundColor Cyan

# Fresh git init — removes any broken .git state from previous attempts
if (Test-Path ".git") { Remove-Item -Recurse -Force ".git" -Confirm:$false }
git init

# Memory-limiting config — critical on Windows to prevent pack-objects OOM crash
git config user.email "user@example.com"
git config user.name "User"
git config core.longpaths      true          # Required for node_modules deep paths on Windows
git config core.autocrlf       false
git config core.compression    0             # Disable compression to avoid OOM
git config pack.compression    0
git config http.postBuffer     524288000     # 500 MB — prevents "remote end hung up" on push
git config pack.windowMemory   "50m"
git config pack.packSizeLimit  "50m"
git config pack.threads        "1"           # Single thread prevents memory spikes

git remote add origin $remoteUrl
git symbolic-ref HEAD refs/heads/$branchName  # Set branch name before any commit exists

# Collect all files excluding the .git directory itself
Write-Host "Scanning files..." -ForegroundColor Yellow
$allFiles = Get-ChildItem -Recurse -File |
    Where-Object { $_.FullName -notmatch '\\.git\\' } |
    ForEach-Object { $_.FullName.Substring($repo.Length + 1) }

$totalFiles   = $allFiles.Count
$totalBatches = [Math]::Ceiling($totalFiles / $batchSize)
Write-Host "Found $totalFiles files across $totalBatches batches of $batchSize" -ForegroundColor Green

$batchNum = 0
for ($i = 0; $i -lt $totalFiles; $i += $batchSize) {
    $batchNum++
    $end   = [Math]::Min($i + $batchSize - 1, $totalFiles - 1)
    $batch = $allFiles[$i..$end]
    Write-Host "`nBatch $batchNum / $totalBatches  ($($batch.Count) files)..." -ForegroundColor Cyan

    # Remove stale lock file — left behind when a previous git process crashed
    Remove-Item ".git\index.lock" -Force -ErrorAction SilentlyContinue

    # Single git add call for the whole batch avoids lock file conflicts
    & git add @batch
    if ($LASTEXITCODE -ne 0) {
        Write-Host "git add failed on batch $batchNum — skipping" -ForegroundColor Red
        continue
    }

    git commit -m "Upload batch $batchNum of $totalBatches"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "git commit failed on batch $batchNum" -ForegroundColor Red
        continue
    }

    # Push with retries; force-push only on the first batch to set the branch
    $pushed = $false
    for ($r = 1; $r -le $maxRetries; $r++) {
        $pushArgs = if ($batchNum -eq 1) {
            @("push", "-f", "origin", $branchName)
        } else {
            @("push", "origin", $branchName)
        }
        $proc = Start-Process "git" -ArgumentList $pushArgs -Wait -NoNewWindow -PassThru
        if ($proc.ExitCode -eq 0) {
            Write-Host "  Pushed (attempt $r)" -ForegroundColor Green
            $pushed = $true
            break
        }
        Write-Host "  Push failed (attempt $r/$maxRetries) — retrying in ${retryWaitSec}s..." -ForegroundColor Yellow
        Start-Sleep -Seconds $retryWaitSec
    }
    if (-not $pushed) {
        Write-Host "FAILED to push batch $batchNum after $maxRetries attempts" -ForegroundColor Red
    }

    Start-Sleep -Seconds 3   # Brief pause between batches
}

Write-Host "`n=== Upload complete ===" -ForegroundColor Green
Write-Host "All files are on branch: $branchName" -ForegroundColor Green
Write-Host "Next step: run github-api-merge.ps1 to merge into main" -ForegroundColor Yellow
