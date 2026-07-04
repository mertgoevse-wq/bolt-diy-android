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

## What Doesn't Work on Android (Yet)

❌ WebContainer (in-browser Node.js runtime)
❌ Terminal / shell commands
❌ Live preview of generated apps
❌ `npm install` / `npm run dev` inside the app

These features require SharedArrayBuffer and cross-origin isolation, which Android WebView does not support. See `PORTING_REPORT.md` for the full analysis and `TODO_NEXT.md` for the roadmap to address these.

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
┌─────────────────────────────────┐
│  Android WebView (Capacitor)    │
│                                 │
│  ┌───────────────────────────┐  │
│  │   bolt.diy Web App        │  │
│  │   (Remix + Vite build)    │  │
│  │                           │  │
│  │  ✅ Chat / AI / Editor   │  │
│  │  ❌ WebContainer (stub)  │  │
│  └───────────────────────────┘  │
│                                 │
│  Capacitor Bridge (native APIs) │
└─────────────────────────────────┘
```

The web app detects Android via `app/lib/adapters/platform.ts` and routes WebContainer-dependent code through fallback adapters in `app/lib/adapters/`.

## License

MIT — same as the parent bolt.diy project.
