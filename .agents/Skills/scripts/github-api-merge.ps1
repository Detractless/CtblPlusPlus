# github-api-merge.ps1
# Merges an upload branch into main entirely via the GitHub REST API --
# no local git fetch, pull, or pack-objects required.
#
# Use this when:
#   - git pull/fetch crashes with "fetch-pack: invalid index-pack output" (OOM)
#   - GitHub PR says "There isn't anything to compare" (unrelated histories)
#   - git push crashes with "pack-objects died of signal 127" (OOM)
#
# Compatible with PowerShell 5.1+ (Windows PowerShell) and PowerShell 7+.
# IMPORTANT: This file must be saved as ASCII or UTF-8 with BOM for PS 5.1.
# Do NOT use special Unicode characters (em-dashes, curly quotes, etc.) anywhere
# in this file -- PS 5.1 misinterprets them as string delimiters.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\github-api-merge.ps1

$ErrorActionPreference = "Stop"

# --- CONFIGURE THESE ---------------------------------------------------------
$repoDir       = "C:\path\to\your\folder"   # Same folder used for upload (for credential lookup)
$owner         = "YourUser"                  # GitHub username or org
$repo          = "YourRepo"                  # Repository name
$subfolderName = ""                          # Subfolder name in main, or "" to merge at root

# Authentication: set $token to a GitHub Personal Access Token (PAT) with repo scope.
# The git-credential-manager approach is unreliable on PS 5.1 due to encoding issues
# with ProcessStartInfo stdin/stdout piping.
# Create a token at: https://github.com/settings/tokens/new (select "repo" scope)
$token         = ""                          # Paste your PAT here

# Get these SHAs by running in the upload folder after Phase 1:
#   git ls-remote origin              -> shows commit SHAs for each branch
#   git cat-file -p <main_commit>     -> shows "tree XXXX" line = mainTreeSha
#   git ls-tree <upload_commit>       -> find your subfolder row = subTreeSha
# Or use the GitHub API (no auth needed for public repos):
#   Invoke-RestMethod "https://api.github.com/repos/OWNER/REPO/git/commits/MAIN_SHA"
$mainCommitSha = "REPLACE_MAIN_BRANCH_COMMIT_SHA"   # Current HEAD of remote main
$mainTreeSha   = "REPLACE_MAIN_BRANCH_TREE_SHA"     # Tree object of remote main commit
$subTreeSha    = "REPLACE_UPLOAD_SUBFOLDER_TREE_SHA" # Tree SHA of subfolder in upload branch
# ------------------------------------------------------------------------------

$apiBase = "https://api.github.com/repos/$owner/$repo"

# --- Authentication -----------------------------------------------------------
# Try PAT first; fall back to git credential manager if no PAT provided.
if (-not $token) {
    Write-Host "No PAT provided, trying git credential manager..." -ForegroundColor Yellow
    $credInput = "protocol=https`nhost=github.com`n`n"
    $credBytes = [System.Text.UTF8Encoding]::new($false).GetBytes($credInput)
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName               = "git"
    $psi.Arguments              = "credential fill"
    $psi.UseShellExecute        = $false
    $psi.RedirectStandardInput  = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError  = $true
    $psi.WorkingDirectory       = $repoDir
    $proc = [System.Diagnostics.Process]::Start($psi)
    $proc.StandardInput.BaseStream.Write($credBytes, 0, $credBytes.Length)
    $proc.StandardInput.BaseStream.Close()
    $credOut = $proc.StandardOutput.ReadToEnd()
    $proc.WaitForExit()

    # Parse credential output carefully -- Where-Object can return arrays in PS 5.1,
    # so Select-Object -First 1 and cast to string before calling .Trim().
    $lines    = $credOut -split "`n"
    $username = "$( ($lines | Where-Object { $_ -match '^username=' } | Select-Object -First 1) -replace '^username=','' )".Trim()
    $token    = "$( ($lines | Where-Object { $_ -match '^password=' } | Select-Object -First 1) -replace '^password=','' )".Trim()

    if (-not $token) {
        Write-Host ""
        Write-Host "ERROR: Could not get credentials from git credential manager." -ForegroundColor Red
        Write-Host "This is common on PS 5.1 due to encoding issues with stdin/stdout piping." -ForegroundColor Red
        Write-Host ""
        Write-Host "Fix: Create a Personal Access Token at https://github.com/settings/tokens/new" -ForegroundColor Yellow
        Write-Host "     Select 'repo' scope, copy the token, and paste it into the `$token variable" -ForegroundColor Yellow
        Write-Host "     at the top of this script." -ForegroundColor Yellow
        throw "Could not get credentials. Set `$token to a GitHub PAT in the script config."
    }
    Write-Host "Authenticated as: $username" -ForegroundColor Green
    $headers = @{
        Authorization  = "Basic $([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("${username}:${token}")))"
        Accept         = "application/vnd.github.v3+json"
        "Content-Type" = "application/json"
    }
} else {
    Write-Host "Using provided PAT for authentication." -ForegroundColor Green
    $headers = @{
        Authorization  = "token $token"
        Accept         = "application/vnd.github.v3+json"
        "Content-Type" = "application/json"
    }
}

# --- Merge logic --------------------------------------------------------------

if ($subfolderName -and $subfolderName -ne "") {
    # Subfolder mode: overlay upload tree as a subfolder inside main's existing tree
    Write-Host "`nStep 1: Creating combined tree on GitHub..." -ForegroundColor Cyan
    $treeBody = ConvertTo-Json -Depth 5 @{
        base_tree = $mainTreeSha
        tree = @(@{
            path = $subfolderName
            mode = "040000"
            type = "tree"
            sha  = $subTreeSha
        })
    }
    $treeResult = Invoke-RestMethod "$apiBase/git/trees" -Method POST -Headers $headers -Body $treeBody
    $finalTreeSha = $treeResult.sha
    Write-Host "Combined tree SHA: $finalTreeSha" -ForegroundColor Green
    $commitMsg = "Add $subfolderName files"
} else {
    # Root mode: replace main's tree entirely with the upload tree
    Write-Host "`nRoot merge mode: upload tree will replace main content." -ForegroundColor Cyan
    $finalTreeSha = $subTreeSha
    $commitMsg = "Add project files"
}

Write-Host "`nStep 2: Creating commit..." -ForegroundColor Cyan
$commitBody = ConvertTo-Json -Depth 5 @{
    message = $commitMsg
    tree    = $finalTreeSha
    parents = @($mainCommitSha)
}
$commitResult = Invoke-RestMethod "$apiBase/git/commits" -Method POST -Headers $headers -Body $commitBody
$newCommitSha = $commitResult.sha
Write-Host "New commit SHA: $newCommitSha" -ForegroundColor Green

Write-Host "`nStep 3: Advancing main branch..." -ForegroundColor Cyan
$refBody   = ConvertTo-Json @{ sha = $newCommitSha; force = $true }
$refResult = Invoke-RestMethod "$apiBase/git/refs/heads/main" -Method PATCH -Headers $headers -Body $refBody
Write-Host "SUCCESS! main is now at: $($refResult.object.sha)" -ForegroundColor Green
Write-Host "Visit: https://github.com/$owner/$repo" -ForegroundColor Yellow
