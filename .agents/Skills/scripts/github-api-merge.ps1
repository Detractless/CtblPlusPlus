# github-api-merge.ps1
# Merges an upload branch into main entirely via the GitHub REST API —
# no local git fetch, pull, or pack-objects required.
#
# Use this when:
#   - git pull/fetch crashes with "fetch-pack: invalid index-pack output" (OOM)
#   - GitHub PR says "There isn't anything to compare" (unrelated histories)
#   - git push crashes with "pack-objects died of signal 127" (OOM)
#
# Usage: powershell -ExecutionPolicy Bypass -File .\github-api-merge.ps1

$ErrorActionPreference = "Stop"

# ── CONFIGURE THESE ──────────────────────────────────────────────────────────
$repoDir       = "C:\path\to\your\folder"    # Same folder used for upload (for credential lookup)
$owner         = "YourUser"                   # GitHub username or org
$repo          = "YourRepo"                   # Repository name
$subfolderName = "YourSubfolder"             # Name the files will appear under in main

# Get these SHAs by running in the upload folder:
#   git ls-remote origin              → shows commit SHAs for each branch
#   git cat-file -p <main_commit>     → shows "tree XXXX" line = mainTreeSha
#   git ls-tree <upload_commit>       → find your subfolder row = subTreeSha
$mainCommitSha = "REPLACE_MAIN_BRANCH_COMMIT_SHA"   # Current HEAD of remote main
$mainTreeSha   = "REPLACE_MAIN_BRANCH_TREE_SHA"     # Tree object of remote main commit
$subTreeSha    = "REPLACE_UPLOAD_SUBFOLDER_TREE_SHA" # Tree SHA of subfolder in upload branch
# ─────────────────────────────────────────────────────────────────────────────

$apiBase = "https://api.github.com/repos/$owner/$repo"

# ── Get credentials from git credential manager ───────────────────────────────
# Uses the same credentials git push uses — no manual token entry required.
Write-Host "Getting GitHub credentials..." -ForegroundColor Cyan
$credInput = [System.Text.UTF8Encoding]::new($false).GetBytes("protocol=https`nhost=github.com`n`n")
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName              = "git"
$psi.Arguments             = "credential fill"
$psi.UseShellExecute       = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError  = $true
$psi.WorkingDirectory      = $repoDir
$proc = [System.Diagnostics.Process]::Start($psi)
$proc.StandardInput.BaseStream.Write($credInput, 0, $credInput.Length)
$proc.StandardInput.BaseStream.Close()
$credOut = $proc.StandardOutput.ReadToEnd()
$proc.WaitForExit()

$username = ($credOut -split "`n" | Where-Object { $_ -match "^username=" }) -replace "^username=", ""
$token    = ($credOut -split "`n" | Where-Object { $_ -match "^password=" }) -replace "^password=", ""
$username = $username.Trim(); $token = $token.Trim()
if (-not $token) {
    throw "Could not get credentials. Make sure you have pushed to this GitHub repo from this machine before (so credentials are stored)."
}
Write-Host "Authenticated as: $username" -ForegroundColor Green

$authB64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("${username}:${token}"))
$headers = @{
    Authorization  = "Basic $authB64"
    Accept         = "application/vnd.github.v3+json"
    "Content-Type" = "application/json"
}

# ── Step 1: Create combined tree on GitHub (server-side, no local packing) ───
# base_tree = main's current tree; we add the upload subfolder on top.
# GitHub builds the new tree entirely on its servers.
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
$newTreeSha = $treeResult.sha
Write-Host "Combined tree SHA: $newTreeSha" -ForegroundColor Green

# ── Step 2: Create a commit pointing to the combined tree ─────────────────────
Write-Host "`nStep 2: Creating commit..." -ForegroundColor Cyan
$commitBody = ConvertTo-Json -Depth 5 @{
    message = "Add $subfolderName files"
    tree    = $newTreeSha
    parents = @($mainCommitSha)
}
$commitResult = Invoke-RestMethod "$apiBase/git/commits" -Method POST -Headers $headers -Body $commitBody
$newCommitSha = $commitResult.sha
Write-Host "New commit SHA: $newCommitSha" -ForegroundColor Green

# ── Step 3: Fast-forward main to the new commit ───────────────────────────────
Write-Host "`nStep 3: Advancing main branch..." -ForegroundColor Cyan
$refBody   = ConvertTo-Json @{ sha = $newCommitSha; force = $false }
$refResult = Invoke-RestMethod "$apiBase/git/refs/heads/main" -Method PATCH -Headers $headers -Body $refBody
Write-Host "SUCCESS! main is now at: $($refResult.object.sha)" -ForegroundColor Green
Write-Host "Visit: https://github.com/$owner/$repo" -ForegroundColor Yellow
