# bolt.diy Android — Android Build Guide

This guide walks you through building and running bolt.diy as a native Android app using [Capacitor](https://capacitorjs.com/).

## What This Is

bolt.diy Android is an Android port/adaptation of bolt.diy, the browser-based AI coding assistant. The Android version wraps the web app in a native Android WebView shell. The chat interface, AI provider selection, code generation, and file editing all work on Android. Features that depend on [WebContainer](https://webcontainer.io/) — in-browser terminal, live preview, and shell commands — are not available in the Android WebView and will show a fallback message.

## Prerequisites

1. **Node.js** ≥ 18.18
2. **npm** or **pnpm** (the project uses pnpm by default)
3. **Android Studio** (for opening and building the native project)
4. **JDK 17+** (bundled with recent Android Studio)
5. **Android SDK** (installed via Android Studio)

> **Tip:** If you don't have Android Studio, install it from https://developer.android.com/studio

## First-Time Setup

```bash
# 1. Install dependencies (from the project root)
npm install --legacy-peer-deps

# 2. Initialize the Android project (only needed once — already done)
npm run android:init

# 3. Build the web app and sync to Android
npm run android:sync
```

## Building the App

```bash
# Build web assets + sync to Android + open Android Studio
npm run android:open
```

Then in Android Studio:
1. Wait for Gradle sync to finish
2. Click the green ▶ Run button (or Build → Build Bundle(s)/APK(s) → Build APK(s))
3. The APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`

### Build APK from command line

```bash
# Automated compilation of the Debug APK:
npm run android:apk:debug
```

This runs the Vite web build, syncs web assets into the Android native directories, and executes the Gradle wrapper to build the debug package at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Running on a Device

1. Enable **Developer Options** and **USB Debugging** on your Samsung Galaxy A56:
   - Settings → About Phone → Software Information
   - Tap "Build number" 7 times
   - Go back → System → Developer Options → Enable USB Debugging
2. Connect your phone via USB
3. Run:
   ```bash
   npm run android:run
   ```
   Or press ▶ in Android Studio.

## Development Workflow

### Live reload during development

For fast iteration, you can point the Android WebView at your dev server:

1. Start the dev server:
   ```bash
   npm run dev
   ```
2. Find your computer's local IP (e.g., `192.168.1.100`)
3. Edit `capacitor.config.ts` and uncomment the `url` line under `server`:
   ```ts
   server: {
     url: 'http://192.168.1.100:5173',
     cleartext: true,
   }
   ```
4. Run `npm run android:copy` and rebuild

> **Note:** Your phone and computer must be on the same WiFi network.

### After making web changes

```bash
npm run android:sync   # rebuild web + push to Android
npm run android:open   # open in Android Studio to run
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run android:init` | Initialize the Android project (run once) |
| `npm run android:sync` | Build web app + sync assets to Android |
| `npm run android:copy` | Copy web assets to Android (no rebuild) |
| `npm run android:open` | Open the Android project in Android Studio |
| `npm run android:build` | Full build: web + sync + Gradle APK |
| `npm run android:run` | Build + deploy to connected device |
| `npm run android:clean` | Clean Android build artifacts |
| `npm run android:dev` | Start Vite dev server for Android SPA shell |
| `npm run android:dev:host` | Start Vite dev server exposed on Wi-Fi (0.0.0.0) |
| `npm run android:webpreview` | Serve the production SPA locally using Vite preview |
| `npm run android:webpreview:host` | Serve production SPA exposed on Wi-Fi (0.0.0.0) |
| `npm run android:apk:debug` | Run Capacitor sync and compile the Android Debug APK |
| `npm run android:apk:release` | Compile the Android Release APK target |
| `npm run android:apk:path` | Output the expected path to the Debug APK |

## What Works on Android

✅ Chat with AI models (OpenAI, Anthropic, Google, etc.)
✅ Code generation and display
✅ Code editor (CodeMirror)
✅ File tree and file management
✅ Settings (API keys, provider selection)
✅ Chat history and persistence
✅ Theme switching (dark/light)

## What Doesn't Work on Android (Without Remote Runtime)

❌ WebContainer (in-browser Node.js runtime)
❌ Terminal / shell commands
❌ Live preview of generated apps
❌ `npm install` / `npm run dev` inside the app

These features require SharedArrayBuffer and cross-origin isolation, which Android WebView does not support.

## Fallback Screens & Static HTML Preview

To ensure the app does not feel broken when WebContainer is unavailable, we have added a polished fallback layer:

1. **Designed Terminal Fallback**: The terminal tab shows a designed fallback informing the user that terminal execution is unavailable on mobile. It features a button that takes the user directly to the Runtime Mode tab in Settings.
2. **Designed Preview Fallback**:
   - If **no static HTML exists**, it explains that Live Preview requires a WebContainer or Remote Runtime and provides a button to configure the Remote Runtime.
   - If an **`index.html` file exists** in the workspace, it offers a **"Run Basic Static Preview"** button. This loads the in-memory `index.html` file into the iframe using a local `Blob` URL. A warning banner alerts the user that external relative assets/scripts may fail to load.
3. **Action Interceptor**: Any shell, build, start, or database commands generated by the AI are intercepted in the runner and failed gracefully with a descriptive message and a Toast warning instead of causing app hangs or crashes.

### Runtime Fallback Mode

When bolt.diy detects that it's running in an Android WebView (or a browser without SharedArrayBuffer), it automatically enters **Android Fallback Mode**. A yellow banner appears at the top of the chat explaining the situation.

In fallback mode:
- **File editing** works in the UI (CodeMirror editor is fully functional)
- **AI chat and code generation** work normally
- **File tree** navigation works (files are kept in memory and persisted via IndexedDB)
- **Terminal, dev server, preview, and package install** are disabled

### Runtime Mode Settings

Open Settings → **Runtime Mode** to see the current runtime status and configure alternatives:

| Mode | Description |
|------|-------------|
| **WebContainer Browser Mode** | Full in-browser runtime. Only available on desktop browsers with SharedArrayBuffer + cross-origin isolation. Greyed out on Android. |
| **Android Fallback Mode** | In-memory file system. Code editing and AI chat work. No terminal, dev server, or preview. This is the default on Android. |
| **Remote Runtime** | Connect to a remote sandbox server for explicit text-file sync and safe allowlisted project commands. File editing stays local and IndexedDB remains the source of truth. |

The settings card lets you save the **Remote Runtime URL**, **Auth Token**, and **Workspace ID**. You can click **Test Connection** to check if the server is healthy, **Create Workspace** to generate a sandboxed folder, **Sync workspace to Remote Runtime** to push all local text files, **Pull remote files** to import missing remote text files after user action, or **Sync current file** to push the open editor file.

The terminal fallback on Android does not accept free-form shell input. When Remote Runtime is configured, it shows buttons for safe predefined command profiles only:

- `npm install`
- `npm run dev`
- `npm run build`
- `pnpm install`
- `pnpm run dev`
- `pnpm run build`

Output streams back into the terminal panel over the Remote Runtime WebSocket, and the running command can be stopped from the same panel. The panel also shows the last command profile, command ID, current/final status, last output timestamp, and exit code when available.

### Setting up the Remote Runtime locally

To use the Remote Runtime with your Android device:

1. **Start the Server on your Computer**:
   From the repository root on your laptop/computer, configure a `.env` file (e.g., `REMOTE_RUNTIME_TOKEN=change-me`) and run:
   ```bash
   set REMOTE_RUNTIME_HOST=0.0.0.0
   set REMOTE_RUNTIME_PORT=8787
   npm run runtime:dev
   ```
   This boots the Express server on `http://0.0.0.0:8787`, reachable from your phone through the laptop LAN IP.

2. **Find your Computer's Local IP**:
   - On Windows: Open Command Prompt and run `ipconfig` (look for `IPv4 Address` under your Wi-Fi/Ethernet adapter, e.g. `192.168.1.123`).
   - On macOS/Linux: Run `ifconfig` or `ip a` (e.g. `192.168.1.123`).

3. **Configure the App URL in Settings**:
   - In Settings → **Runtime Mode**, toggle the mode to **Remote Runtime**.
   - Set **Server URL** to your computer's local IP and port: `http://192.168.x.x:8787` (e.g. `http://192.168.1.123:8787`).
     *Note: Using `http://localhost:8787` or `http://127.0.0.1:8787` inside the phone app will fail because the mobile WebView resolves it to the phone device itself.*
   - Set **Auth Token** to the value configured on your server (e.g. `change-me`).
   - Tap **Save** on both, then click **Test Connection** to verify health status, and finally tap **Create Workspace** to configure a sandbox!

4. **Sync Files Explicitly**:
   - Use **Sync workspace to Remote Runtime** to push all local text files from IndexedDB.
   - Use **Pull remote files** only when you want to copy remote files into local fallback storage. Local files win if contents differ.
   - Binary files are skipped for now and shown in the sync status warnings.

### Capability Matrix

| Feature | WebContainer | Android Fallback | Remote (future) |
|---------|:---:|:---:|:---:|
| File editing | ✅ real | ✅ in-memory | ✅ local |
| Terminal | ✅ | ❌ stub | ✅ remote |
| Command execution | ✅ | ❌ | ✅ allowlisted profiles |
| Package install | ✅ | ❌ | ✅ allowlisted profiles |
| Dev server | ✅ | ❌ | ✅ allowlisted profiles |
| Live preview | ✅ | ❌ | ✅ remote |
| AI chat | ✅ | ✅ | ✅ |
| Code generation | ✅ | ✅ | ✅ |

See `PORTING_REPORT.md` for the full technical analysis and `src/mobile/adapters/runtime/` for the adapter abstraction layer.
## GitHub Sync

### Connecting Your GitHub Account

1. Open **Settings → GitHub** in the app
2. Choose token type:
   - **Personal Access Token (Classic)** — simplest, works for most users
   - **Fine-grained Token** — more granular permissions
3. Go to [github.com/settings/tokens](https://github.com/settings/tokens) to create a token
4. Required scopes for classic tokens: `repo`, `read:org`, `read:user`
5. Paste the token and tap **Connect**
6. You should see your GitHub profile and repositories

Alternatively, set the `VITE_GITHUB_ACCESS_TOKEN` environment variable in `.env.local` before building the app.

### GitHub Sync Panel

Once connected, scroll down in the GitHub settings tab to find the **GitHub Sync** panel. This panel lets you:

- **Configure your repository URL** (e.g. `https://github.com/your-username/your-repo`)
- **Set the branch name** (default: `main`)
- **View sync status** (last sync time, uncommitted file count, error messages)

### Commit & Push — Current Limitations

The **Commit Changes** and **Push to GitHub** buttons are currently **disabled** on Android. Here's why:

| Action | WebContainer (Desktop) | Android Fallback | Remote Runtime (Future) |
|--------|:---:|:---:|:---:|
| Commit | ✅ via isomorphic-git | ❌ no git runtime | ✅ via remote |
| Push | ✅ via isomorphic-git | ❌ no git runtime | ✅ via remote |

Git operations (commit, push) require a runtime that can execute `git` commands. On Android Fallback Mode, there is no local runtime — only in-memory file editing. The buttons show a clear explanation when disabled.

### What You Can Do Now

Even without commit/push on mobile, you can:
- ✅ Connect your GitHub account and browse repositories
- ✅ Configure which repo and branch you're working on
- ✅ Edit code files in the editor
- ✅ Generate code with AI
- ✅ Export your project as a ZIP (Settings → Data Management)
- ✅ Sync to your computer and commit from there

### Syncing to Desktop for Commit/Push

1. Edit files on your Android device
2. Export the project as a ZIP (Settings → Data Management → Export)
3. Transfer the ZIP to your computer
4. Unzip into your local git repository
5. Commit and push from your computer:

```bash
cd your-repo
git add .
git commit -m "Changes from Android"
git push origin main
```

### Troubleshooting GitHub Auth/Token Issues

**"Authentication failed: 401 Unauthorized"**
- Your token may have expired. Generate a new one at github.com/settings/tokens
- Make sure you selected the right token type (classic vs fine-grained)
- For classic tokens, ensure the `repo` scope is checked

**"Authentication failed: 403 Forbidden"**
- Your token doesn't have sufficient permissions
- For fine-grained tokens, make sure repository access includes the repos you need
- Check if your organization requires SSO — you may need to authorize the token

**"Could not resolve host" / Network errors**
- Make sure your device has internet connectivity
- GitHub API calls go to `api.github.com` — ensure it's not blocked
- If behind a proxy, Capacitor WebView may need additional configuration

**Token works on desktop but not on Android**
- The token is stored in a cookie + localStorage. If the WebView clears storage on restart, you'll need to reconnect
- Make sure `Cookies.set('githubToken', ...)` is not blocked by WebView settings
- Check `capacitor.config.ts` for any storage restrictions

**Fine-grained token issues**
- Fine-grained tokens are newer and may have different permission requirements
- Ensure "Repository access" includes the specific repos or "All repositories"
- Organization access may need explicit approval from org admins

**Connection lost after app restart**
- The app saves your connection to localStorage. If the WebView clears storage, reconnection is needed
- Setting `VITE_GITHUB_ACCESS_TOKEN` in `.env.local` provides automatic connection at build time
- This is the most reliable method for Android — the token is baked into the app

### TODO: Real GitHub API Integration

The GitHub Sync panel currently saves configuration only. Real git operations (commit, push) via the GitHub REST API or a remote runtime server are not yet implemented. The roadmap:

1. **Remote Runtime backend** — a server-side sandbox that can run git commands
2. **GitHubSyncAdapter** — implements commit/push using the GitHub REST API (`/repos/{owner}/{repo}/git/trees`, `/git/commits`, `/git/refs`) directly, without needing a local git runtime
3. **WebSocket sync** — real-time file sync between the app and the remote repository


## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and add your API keys:

```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

At minimum, you need at least one LLM provider key (e.g., `OPENAI_API_KEY`).

### App ID and Name

Edit `capacitor.config.ts`:
```ts
appId: 'com.mertgoevse.boltdiyandroid',  // your package name
appName: 'bolt.diy Android',        // display name
```

## Troubleshooting

**"WebContainer is not available" message**
This is expected on Android. The app falls back to a chat-only mode. See above.

**Build fails with Gradle errors**
- Make sure you have Android Studio installed and SDK updated
- Run `npm run android:clean` then retry
- Check `android/local.properties` has the correct `sdk.dir` path

**White screen on launch**
- Run `npm run android:sync` to make sure web assets are up to date
- Check Logcat in Android Studio for JavaScript console errors

**API key not working**
- Make sure `.env.local` is set up with valid keys
- Keys are embedded at build time — rebuild after changing them

## Architecture

```
┌─────────────────────────────────────┐
│  Android WebView (Capacitor)        │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  bolt.diy Web App             │  │
│  │  (Remix + Vite build)         │  │
│  │                               │  │
│  │  ✅ Chat / AI / Editor       │  │
│  │  ✅ File editing (in-memory) │  │
│  │                               │  │
│  │  Runtime Adapter Layer        │  │
│  │  ┌─────────────────────────┐ │  │
│  │  │ AndroidFallbackRuntime  │ │  │
│  │  │ Adapter                 │ │  │
│  │  │ (in-memory FS, stub     │ │  │
│  │  │  terminal, no preview)  │ │  │
│  │  └─────────────────────────┘ │  │
│  └───────────────────────────────┘  │
│                                     │
│  Capacitor Bridge (native APIs)     │
└─────────────────────────────────────┘

  Future: Remote Runtime
  ┌─────────────────────────────┐
  │  RemoteRuntimeAdapter       │
  │  (WebSocket → server-side   │
  │   sandbox for commands,     │
  │   dev server, preview)      │
  └─────────────────────────────┘
```

### Runtime Adapter Layer

The app detects Android via `app/lib/adapters/platform.ts` and selects the
appropriate runtime adapter:

- `src/mobile/adapters/runtime/RuntimeAdapter.ts` — interface
- `src/mobile/adapters/runtime/WebContainerRuntimeAdapter.ts` — desktop
- `src/mobile/adapters/runtime/AndroidFallbackRuntimeAdapter.ts` — Android
- `src/mobile/adapters/runtime/index.ts` — factory + platform detection

The runtime mode is tracked in `app/lib/stores/runtime-mode.ts` and
displayed in Settings → Runtime Mode. A banner component
(`app/components/mobile/RuntimeModeBanner.tsx`) shows the current mode
at the top of the chat area.

The existing lower-level adapter layer in `app/lib/adapters/` continues
to work alongside the new runtime adapter abstraction.

## License

MIT — same as the parent bolt.diy project.
