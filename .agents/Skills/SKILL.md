---
name: github-large-folder-upload
description: >
  Upload a large local folder (hundreds to thousands of files, including node_modules)
  to GitHub when the web UI file limit blocks you, then merge it into main even when
  git push, pull, and fetch all crash with out-of-memory errors on Windows.
  Use this skill whenever: the user can't upload files to GitHub because there are too
  many (GitHub web UI caps at ~100 files); git push fails with "pack-objects died of
  signal 127"; git pull or fetch crashes with "fetch-pack: invalid index-pack output";
  a GitHub PR says "There isn't anything to compare" due to unrelated histories;
  or they need to add a large folder as a subfolder inside an existing repo without
  losing any current repo content. Also trigger for any variant of these phrases:
  "too many files for GitHub", "node_modules to GitHub", "upload whole folder",
  "unrelated histories", "pack-objects signal 127", "index-pack output" error.
---

# GitHub Large Folder Upload (Windows)

Two-phase workflow for getting a large folder onto GitHub when normal git push fails.

**Phase 1** — Batch-upload the folder to a staging branch (90 files per commit).  
**Phase 2** — Merge into `main` via the GitHub REST API (no local git packing needed).

Scripts live in `scripts/` next to this file. Always run them with:
```
powershell -ExecutionPolicy Bypass -File .\script-name.ps1
```

---

## Why normal git fails on Windows

| Symptom | Root cause |
|---------|-----------|
| `pack-objects died of signal 127` | Windows OOM: git tries to compress thousands of objects at once |
| `fetch-pack: invalid index-pack output` | Same OOM, but during fetch/pull (receiving objects) |
| `remote helper 'https' aborted session` | The HTTPS subprocess crashes, often triggered by the above |
| `There isn't anything to compare` on GitHub PR | Branches have no common ancestor — can't PR-merge |
| `index.lock: File exists` | A previous git process crashed and left a stale lock file |

The fix for push OOM: commit in small batches (≤90 files) so pack-objects only sees a tiny diff each time.  
The fix for fetch/merge OOM: skip local git entirely and use the GitHub REST API, which builds the merged tree on GitHub's servers.

---

## Phase 1: Batch Upload

### Setup

Edit the top of `scripts/upload-to-github.ps1`:

```powershell
$repo       = "C:\full\path\to\folder"             # The folder to upload
$remoteUrl  = "https://github.com/User/Repo.git"
$branchName = "upload-branch"                       # A new branch — NOT main
$batchSize  = 90                                    # Keep at 90 or lower
```

Then run:
```
powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1
```

The script will:
1. Wipe any existing `.git` folder (fresh start avoids broken state)
2. Apply memory-limiting git configs (`pack.windowMemory 50m`, `pack.threads 1`, etc.)
3. Split all files into batches and commit + push each one
4. Force-push only the first batch; subsequent batches are normal pushes
5. Auto-remove stale `index.lock` files before each batch
6. Retry each push up to 8 times with 12-second waits

### Troubleshooting Phase 1

**`pack-objects died of signal 127`** — Reduce `$batchSize` to 50. Verify git configs are applied:
```powershell
git config --list | Select-String "compression|postBuffer|windowMemory"
```

**`index.lock: File exists`** even with auto-removal — Another git process is still running. Kill it:
```powershell
Get-Process git | Stop-Process -Force
Remove-Item ".git\index.lock" -Force
```

**`Updates were rejected (fetch first)`** — The remote branch diverged (usually from a partially-successful earlier attempt). The script force-pushes batch 1 automatically. If this appears on later batches, re-run the whole script from scratch.

**`src refspec does not match any`** — The branch doesn't exist yet because no commit has been made. This means batch 1 failed silently — check that `git add` and `git commit` succeeded before the push.

---

## Optional: Reorganize into a Subfolder

If you want the files under `MyProject.WebUI/` instead of at the root of the branch:

```powershell
Set-Location "C:\path\to\folder"
$subdir = "MyProject.WebUI"
New-Item -ItemType Directory -Force $subdir | Out-Null
git ls-files | Where-Object { $_ -notmatch "^$subdir/" } | ForEach-Object {
    $dst = "$subdir\$_"
    New-Item -ItemType Directory -Force (Split-Path $dst) | Out-Null
    git mv $_ $dst
}
git commit -m "Reorganize into $subdir subfolder"
git push origin upload-branch
```

---

## Phase 2: Merge into Main via GitHub API

### Why not a normal PR?

- GitHub blocks PR merges when branches share no commit history ("unrelated histories")
- `git pull --allow-unrelated-histories` crashes on Windows with 6000+ objects (same OOM)
- `git fetch` also crashes — you can't get remote objects down either

The GitHub REST API solves this by doing everything server-side:
1. Read the tree SHA of remote `main`
2. Create a new tree = main's files + the upload subfolder
3. Create a commit on top of main pointing to the new tree
4. Advance the `main` ref to that commit

No objects are transferred to your machine.

### Get the required SHAs

Run these in the upload folder **after Phase 1 completes**:

```powershell
# List all remote branch commit SHAs
git ls-remote origin

# From the output, grab the SHA for main (call it MAIN_COMMIT)
# and the SHA for upload-branch (call it UPLOAD_COMMIT).

# Get main's tree SHA
git cat-file -p MAIN_COMMIT
# → look for the line:  tree 9e061bc...   ← that's mainTreeSha

# Get the upload subfolder's tree SHA
git ls-tree UPLOAD_COMMIT
# → look for the line:  040000 tree c8583c8...  MyProject.WebUI  ← that's subTreeSha
```

Or use the GitHub API directly (no auth needed for public repos):
```powershell
# Get main's tree SHA
$c = Invoke-RestMethod "https://api.github.com/repos/User/Repo/git/commits/MAIN_COMMIT"
$c.tree.sha   # → mainTreeSha

# Get the subfolder's tree SHA
$t = Invoke-RestMethod "https://api.github.com/repos/User/Repo/git/trees/$($c.tree.sha)"
($t.tree | Where-Object { $_.path -eq "MyProject.WebUI" }).sha   # → subTreeSha
```

### Configure and run

Edit the top of `scripts/github-api-merge.ps1`:

```powershell
$repoDir        = "C:\path\to\folder"        # Same folder as Phase 1 (for credential lookup)
$owner          = "YourUser"
$repo           = "YourRepo"
$subfolderName  = "MyProject.WebUI"          # How the folder should appear in main

$mainCommitSha  = "614f68c..."               # Current HEAD of remote main
$mainTreeSha    = "9e061bc..."               # Tree SHA of remote main commit
$subTreeSha     = "c8583c8..."               # Tree SHA of your subfolder in upload branch
```

Then run:
```
powershell -ExecutionPolicy Bypass -File .\github-api-merge.ps1
```

### How credentials work

The script calls `git credential fill` — the same mechanism git push uses. As long as you successfully pushed in Phase 1, the credentials are already stored in Windows Credential Manager and the script picks them up automatically. No manual token entry needed.

### Troubleshooting Phase 2

**`Could not get credentials`** — Phase 1 must have pushed at least one batch successfully first. If you're starting fresh, push any single file manually to store credentials, then re-run.

**`422 Unprocessable Entity`** from the API — One of your SHAs doesn't exist on GitHub. Re-check with `git ls-remote origin` and `git cat-file -p`.

**`fatal: the remote end hung up unexpectedly`** during push (if you try git push instead of API) — Don't use git push for this step. Use the API script.

**Script runs but main still looks wrong** — Check the URL printed at the end and hard-refresh GitHub. The API update is instant but browser cache can lag.

---

## Full Workflow Checklist

```
[ ] Edit upload-to-github.ps1 — set $repo, $remoteUrl, $branchName
[ ] Run: powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1
[ ] (Optional) Reorganize into subfolder + push
[ ] Run: git ls-remote origin  → note main and upload-branch commit SHAs
[ ] Run: git cat-file -p <main_commit>  → note tree SHA
[ ] Run: git ls-tree <upload_commit>  → note subfolder tree SHA
[ ] Edit github-api-merge.ps1 — fill in all 5 SHAs + owner/repo/subfolder
[ ] Run: powershell -ExecutionPolicy Bypass -File .\github-api-merge.ps1
[ ] Visit GitHub — main now contains both original files AND the new subfolder
```
