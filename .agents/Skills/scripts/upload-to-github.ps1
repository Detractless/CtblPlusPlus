# upload-to-github.ps1
# Uploads a large local folder to a GitHub branch in batches of N files.
# Handles Windows OOM (pack-objects signal 127), index.lock conflicts, and push retries.
#
# Compatible with PowerShell 5.1+ (Windows PowerShell) and PowerShell 7+.
# IMPORTANT: This file must be saved as ASCII or UTF-8 with BOM for PS 5.1.
# Do NOT use special Unicode characters (em-dashes, curly quotes, etc.) anywhere
# in this file -- PS 5.1 reads scripts as Windows-1252 by default and will
# misinterpret multi-byte UTF-8 sequences as string delimiters, causing parse errors.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1

$ErrorActionPreference = "Continue"

# --- CONFIGURE THESE ---------------------------------------------------------
$repo         = "C:\full\path\to\folder"                   # Full path to the folder to upload
$remoteUrl    = "https://github.com/YourUser/YourRepo.git" # GitHub repo URL
$branchName   = "upload-branch"                            # New branch name (NOT main)
$batchSize    = 90                                         # Files per commit (keep at or below 90)
$maxRetries   = 8                                          # Push retry attempts per batch
$retryWaitSec = 12                                         # Seconds between retries
# ------------------------------------------------------------------------------

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

    # Write file paths to a temp file WITHOUT a UTF-8 BOM, then pass to git add.
    # PS 5.1's Set-Content -Encoding UTF8 writes a BOM which corrupts the first
    # filename. Using .NET directly avoids this.
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

    # Push with retries.
    # IMPORTANT: Call git push directly -- do NOT use Start-Process.
    # Start-Process runs git in a detached subprocess where:
    #   - stderr (error messages) is invisible
    #   - $LASTEXITCODE is not set (must use $proc.ExitCode instead)
    #   - credential helper interactions can break
    # Also do NOT append 2>&1 -- in PS 5.1 this wraps stderr lines in
    # ErrorRecord objects that can corrupt parsing of subsequent statements.
    $pushed = $false
    for ($r = 1; $r -le $maxRetries; $r++) {
        git push origin $branchName
        $pushExit = $LASTEXITCODE
        if ($pushExit -eq 0) {
            Write-Host "  Pushed batch $batchNum ok (attempt $r)" -ForegroundColor Green
            $pushed = $true
            break
        }
        Write-Host "  Push failed exit=$pushExit (attempt $r of $maxRetries) waiting ${retryWaitSec}s" -ForegroundColor Yellow
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
