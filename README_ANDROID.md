# Bolt.diy for Android

This guide walks you through building and running bolt.diy as a native Android app using [Capacitor](https://capacitorjs.com/).

## What This Is

Bolt.diy is a browser-based AI coding assistant. The Android version wraps the web app in a native Android WebView shell. The chat interface, AI provider selection, code generation, and file editing all work on Android. Features that depend on [WebContainer](https://webcontainer.io/) — in-browser terminal, live preview, and shell commands — are not available in the Android WebView and will show a fallback message.

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
npm run android:build
```

This runs the web build, syncs to Android, and invokes Gradle to produce a release APK.

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

### Runtime Fallback Mode

When bolt.diy detects that it's running in an Android WebView (or a browser without SharedArrayBuffer), it automatically enters **Android Fallback Mode**. A yellow banner appears at the top of the chat explaining the situation.

In fallback mode:
- **File editing** works in the UI (CodeMirror editor is fully functional)
- **AI chat and code generation** work normally
- **File tree** navigation works (files are kept in memory)
- **Terminal, dev server, preview, and package install** are disabled

### Runtime Mode Settings

Open Settings → **Runtime Mode** to see the current runtime status and configure alternatives:

| Mode | Description |
|------|-------------|
| **WebContainer Browser Mode** | Full in-browser runtime. Only available on desktop browsers with SharedArrayBuffer + cross-origin isolation. Greyed out on Android. |
| **Android Fallback Mode** | In-memory file system. Code editing and AI chat work. No terminal, dev server, or preview. This is the default on Android. |
| **Remote Runtime** | Connect to a remote sandbox server for command execution, package install, and dev server. File editing stays local. Enter the remote runtime URL in the settings. |

The **Remote Runtime URL** field lets you save the URL of a future remote runtime server. The backend for this is not yet implemented — the URL is saved locally for when the remote runtime backend becomes available.

### Capability Matrix

| Feature | WebContainer | Android Fallback | Remote (future) |
|---------|:---:|:---:|:---:|
| File editing | ✅ real | ✅ in-memory | ✅ local |
| Terminal | ✅ | ❌ stub | ✅ remote |
| Command execution | ✅ | ❌ | ✅ remote |
| Package install | ✅ | ❌ | ✅ remote |
| Dev server | ✅ | ❌ | ✅ remote |
| Live preview | ✅ | ❌ | ✅ remote |
| AI chat | ✅ | ✅ | ✅ |
| Code generation | ✅ | ✅ | ✅ |

See `PORTING_REPORT.md` for the full technical analysis and `src/mobile/adapters/runtime/` for the adapter abstraction layer.

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
appId: 'com.boltdiy.app',  // your package name
appName: 'Bolt DIY',        // display name
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
