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

**Phase 1** - Batch-upload the folder to a staging branch (90 files per commit).
**Phase 2** - Merge into `main` via the GitHub REST API (no local git packing needed).

Scripts live in `scripts/` next to this file. Always run them with:
```
powershell -ExecutionPolicy Bypass -File .\script-name.ps1
```

---

## Compatibility

**Requires:** Windows PowerShell 5.1+ or PowerShell 7+, git for Windows.

### Critical: PowerShell 5.1 constraints

Windows Server 2022, Windows 10/11 ship with PowerShell 5.1 (`powershell.exe`).
PS 5.1 has several behaviors that silently break scripts written for PS 7:

| PS 5.1 behavior | Impact | Fix used in these scripts |
|------------------|--------|--------------------------|
| `Set-Content -Encoding UTF8` writes a BOM | BOM bytes prepended to first line corrupt file contents (e.g., git pathspec files) | Use `[System.IO.File]::WriteAllLines()` with `[System.Text.UTF8Encoding]::new($false)` |
| Scripts read as Windows-1252 (not UTF-8) | Multi-byte UTF-8 chars (em-dashes, curly quotes) are misread as quote characters, causing parse errors | Use ASCII only in all `.ps1` files -- no em-dashes, no curly quotes, no special symbols |
| `2>&1` on native commands wraps stderr in ErrorRecord | Subsequent string interpolation can be corrupted (`$var` inside strings parsed as commands) | Never use `2>&1` on git commands -- stderr prints to console naturally |
| `Where-Object` can return arrays instead of scalars | Calling `.Trim()` on an array throws `does not contain a method named 'Trim'` | Cast to string with `"$(...)"` or pipe through `Select-Object -First 1` before `.Trim()` |
| `Start-Process` runs in detached subprocess | stderr is invisible, `$LASTEXITCODE` is not set, credential helper can break | Always call git directly (e.g., `git push origin branch`) instead of `Start-Process "git"` |

**Rule of thumb:** If AI generates or modifies these scripts, the output MUST be ASCII-only
and must not use `Start-Process`, `2>&1`, or `Set-Content -Encoding UTF8` for file I/O.

---

## Why normal git fails on Windows

| Symptom | Root cause |
|---------|-----------|
| `pack-objects died of signal 127` | Windows OOM: git tries to compress thousands of objects at once |
| `fetch-pack: invalid index-pack output` | Same OOM, but during fetch/pull (receiving objects) |
| `remote helper 'https' aborted session` | The HTTPS subprocess crashes, often triggered by the above |
| `There isn't anything to compare` on GitHub PR | Branches have no common ancestor -- can't PR-merge |
| `index.lock: File exists` | A previous git process crashed and left a stale lock file |

The fix for push OOM: commit in small batches (<=90 files) so pack-objects only sees a tiny diff each time.
The fix for fetch/merge OOM: skip local git entirely and use the GitHub REST API, which builds the merged tree on GitHub's servers.

---

## Phase 1: Batch Upload

### Setup

Edit the top of `scripts/upload-to-github.ps1`:

```powershell
$repo       = "C:\full\path\to\folder"             # The folder to upload
$remoteUrl  = "https://github.com/User/Repo.git"
$branchName = "upload-branch"                       # A new branch -- NOT main
$batchSize  = 90                                    # Keep at 90 or lower
```

Then run:
```
powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1
```

The script will:
1. Wipe any existing `.git` folder (fresh start avoids broken state)
2. Apply memory-limiting git configs (`pack.windowMemory 50m`, `pack.threads 1`, etc.)
3. Write each batch of file paths to a temp file (BOM-free via .NET) and stage with `--pathspec-from-file`
4. Commit and push each batch directly (no `Start-Process`, no `2>&1`)
5. Auto-remove stale `index.lock` files before each batch
6. Retry each push up to 8 times with 12-second waits

### How git add works in these scripts

The script does NOT use `& git add @batch` (PowerShell array splatting) because this is
fragile with file paths containing special characters. Instead it:

1. Writes batch file paths to a temp file using `[System.IO.File]::WriteAllLines()` with
   a BOM-free UTF-8 encoding (`[System.Text.UTF8Encoding]::new($false)`)
2. Passes the temp file to `git add --pathspec-from-file="$tmpFile"`
3. Deletes the temp file

This approach is reliable across PS 5.1, PS 7, and all file path formats.

### Troubleshooting Phase 1

**`pack-objects died of signal 127`** - Reduce `$batchSize` to 50. Verify git configs are applied:
```powershell
git config --list | Select-String "compression|postBuffer|windowMemory"
```

**`index.lock: File exists`** even with auto-removal - Another git process is still running. Kill it:
```powershell
Get-Process git | Stop-Process -Force
Remove-Item ".git\index.lock" -Force
```

**`Updates were rejected (fetch first)`** - The remote branch diverged (usually from a partially-successful earlier attempt). The script handles this by being re-runnable from scratch -- just run it again and it will wipe `.git` and start over.

**`src refspec does not match any`** - The branch doesn't exist yet because no commit has been made. This means the git add or git commit step failed silently -- check the console output for errors above the push failure.

**`fatal: pathspec ... did not match any files`** - If the first filename in the error starts with garbled characters, the temp file has a UTF-8 BOM. Make sure the script uses `[System.Text.UTF8Encoding]::new($false)` and NOT `Set-Content -Encoding UTF8`.

**Script won't parse / `MissingEndCurlyBrace`** - The script contains non-ASCII characters (em-dashes, curly quotes). Open it in a text editor and replace all special characters with ASCII equivalents. Or re-save the file as ASCII.

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
- `git fetch` also crashes -- you can't get remote objects down either

The GitHub REST API solves this by doing everything server-side:
1. Read the tree SHA of remote `main`
2. Create a new tree = main's files + the upload subfolder (or replace main entirely)
3. Create a commit on top of main pointing to the new tree
4. Advance the `main` ref to that commit

No objects are transferred to your machine.

### Authentication

**Recommended: Use a Personal Access Token (PAT).**

The `git credential fill` approach via ProcessStartInfo is unreliable on PS 5.1 due to
encoding issues with stdin/stdout piping. Instead:

1. Go to https://github.com/settings/tokens/new
2. Select the `repo` scope
3. Copy the token
4. Paste it into the `$token` variable at the top of `github-api-merge.ps1`

The script will fall back to `git credential fill` if no PAT is set, but this may fail
on PS 5.1. If it does, you'll get a clear error message telling you to use a PAT instead.

**Security:** Delete or revoke the token after the merge is complete.

### Get the required SHAs

Run these in the upload folder **after Phase 1 completes**:

```powershell
# List all remote branch commit SHAs
git ls-remote origin

# From the output, grab the SHA for main (call it MAIN_COMMIT)
# and the SHA for upload-branch (call it UPLOAD_COMMIT).

# Get main's tree SHA (can't use git cat-file locally because we haven't fetched main)
# Use the GitHub API instead:
$c = Invoke-RestMethod "https://api.github.com/repos/User/Repo/git/commits/MAIN_COMMIT"
$c.tree.sha   # -> mainTreeSha

# Get the upload branch's root tree SHA (this one IS local):
git cat-file -p UPLOAD_COMMIT
# -> look for the line:  tree 0bfd0b69...   <- that's subTreeSha (the root tree)

# If you reorganized into a subfolder, get the subfolder's tree SHA instead:
git ls-tree UPLOAD_COMMIT
# -> look for the line:  040000 tree c8583c8...  MyProject.WebUI  <- subTreeSha
```

### Configure and run

Edit the top of `scripts/github-api-merge.ps1`:

```powershell
$repoDir        = "C:\path\to\folder"        # Same folder as Phase 1
$owner          = "YourUser"
$repo           = "YourRepo"
$subfolderName  = ""                         # "" for root merge, or "MyProject.WebUI" for subfolder
$token          = "ghp_xxxxxxxxxxxx"         # Your GitHub PAT

$mainCommitSha  = "614f68c..."               # Current HEAD of remote main
$mainTreeSha    = "9e061bc..."               # Tree SHA of remote main commit
$subTreeSha     = "c8583c8..."               # Root tree SHA of upload branch (or subfolder tree)
```

Then run:
```
powershell -ExecutionPolicy Bypass -File .\github-api-merge.ps1
```

### Merge modes

- **Root mode** (`$subfolderName = ""`): The upload tree replaces main's content entirely.
  Use this when uploading to a dedicated repo.
- **Subfolder mode** (`$subfolderName = "MyProject.WebUI"`): The upload tree is added as a
  subfolder inside main's existing tree. Use this when adding files to a repo that already
  has other content.

### Troubleshooting Phase 2

**`Could not get credentials`** - Set `$token` to a GitHub PAT. The git-credential-manager
fallback is unreliable on PS 5.1.

**`422 Unprocessable Entity`** from the API - One of your SHAs doesn't exist on GitHub.
Re-check with `git ls-remote origin` and the API calls described above.

**`fatal: the remote end hung up unexpectedly`** during push (if you try git push instead
of API) - Don't use git push for this step. Use the API script.

**Script runs but main still looks wrong** - Check the URL printed at the end and
hard-refresh GitHub (Ctrl+Shift+R). The API update is instant but browser cache can lag.

**`does not contain a method named 'Trim'`** - PS 5.1 returned an array instead of a
scalar from `Where-Object`. The updated script handles this, but if you've modified the
credential parsing, wrap results in `"$(...)"` before calling `.Trim()`.

---

## Full Workflow Checklist

```
[ ] Edit upload-to-github.ps1 -- set $repo, $remoteUrl, $branchName
[ ] Run: powershell -ExecutionPolicy Bypass -File .\upload-to-github.ps1
[ ] Verify: check console output for "Pushed batch N ok" on every batch
[ ] (Optional) Reorganize into subfolder + push
[ ] Run: git ls-remote origin  -> note main and upload-branch commit SHAs
[ ] Get main's tree SHA via GitHub API (see instructions above)
[ ] Get upload branch's root tree SHA: git cat-file -p <upload_commit>
[ ] Create a GitHub PAT at https://github.com/settings/tokens/new (repo scope)
[ ] Edit github-api-merge.ps1 -- fill in SHAs + owner/repo/token
[ ] Run: powershell -ExecutionPolicy Bypass -File .\github-api-merge.ps1
[ ] Visit GitHub -- main now contains the uploaded files
[ ] Revoke the PAT at https://github.com/settings/tokens
```
