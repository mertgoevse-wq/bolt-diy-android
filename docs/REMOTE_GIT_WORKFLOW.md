# Remote Runtime Git Workflow

This document describes the architecture, security constraints, and API specifications for managing Git repositories via the Remote Runtime on Android.

## Architecture & Goals

To keep the Android Capacitor app lightweight and run without a local WebContainer container, file editing and git sync rely on the **Remote Runtime**.
By default, the Android app edits files in an in-memory IndexedDB workspace. The Remote Runtime synchronizes these files and allows the user to run shell commands, preview their site, and sync changes back to GitHub.

To enable version control from the phone, the Remote Runtime exposes a restricted Git API.

---

## Security Policies & Constraints

To prevent malicious command execution or accidental source code disclosure:

1. **No Arbitrary Commands**
   The Remote Runtime strictly forbids arbitrary bash execution (e.g. `git checkout --force`). Only predefined, allowlisted commands can be run.
2. **`execFile` Execution**
   Commands are spawned directly using `child_process.execFile` (which bypasses the shell processor) instead of `exec`. This prevents shell metacharacter injections (e.g. `; rm -rf /`).
3. **Workspace Isolation**
   All Git commands run strictly inside the user's workspace path (e.g., `remote-runtime/workspaces/ws_<id>`). The path is validated using path normalization to prevent directory traversal.
4. **Credential Protection & Log Masking**
   Personal Access Tokens (PATs) must never be logged or serialized in outputs. Any command output containing the remote URL (which may encode the token) must be sanitized.
5. **No Automatic Pushing**
   No push operations are triggered implicitly. Commits and pushes must be explicitly clicked and confirmed by the user.

---

## Allowed Operations (MVP)

The following core Git operations are supported by the Git helper module:

- `git status` — Check workspace diff state.
- `git init` — Initialize a git repository if one doesn't exist.
- `git add .` — Stage all modified files.
- `git commit -m "<user message>"` — Commit staged changes (runs with fallback git author config if none exists globally).
- `git remote set-url origin "<repo url>"` — Configure repository remote endpoint.
- `git push origin main` — Mocked/stubbed dry-run pushing with warning headers.

---

## API Contract (Endpoints)

All endpoints require authorization via the `REMOTE_RUNTIME_TOKEN` and a valid `workspaceId`.

### 1. Get Git Status
* **Endpoint:** `GET /workspace/:id/git/status`
* **Response (Success):**
  ```json
  {
    "ok": true,
    "status": "On branch main\nnothing to commit, working tree clean"
  }
  ```

### 2. Initialize Git Repository
* **Endpoint:** `POST /workspace/:id/git/init`
* **Response (Success):**
  ```json
  {
    "ok": true,
    "output": "Initialized empty Git repository in /workspaces/ws_123/.git/"
  }
  ```

### 3. Stage & Commit Changes
* **Endpoint:** `POST /workspace/:id/git/commit`
* **Payload:**
  ```json
  {
    "message": "feat: commit changes from android"
  }
  ```
* **Response (Success):**
  ```json
  {
    "ok": true,
    "output": "[main 1234567] feat: commit changes from android\n 1 file changed, 1 insertion(+)"
  }
  ```

### 4. Push to Remote Repo
* **Endpoint:** `POST /workspace/:id/git/push`
* **Payload:**
  ```json
  {
    "token": "ghp_xxxxxxxxxxxx",
    "repoUrl": "https://github.com/username/repo"
  }
  ```
* **Response (Success/Stub):**
  ```json
  {
    "ok": true,
    "output": "Dry-run push simulated successfully! Full remote push implementation is pending verification."
  }
  ```

---

## Future Enhancements
- Safe integration of temporary credential helpers to support actual remote push operations without persisting tokens on disk.
- Partial staging (git add on specific file lists).
- Branch management (switching branches, list remote branches).
