# bolt.diy Android — Current Status

**Last updated:** 2026-07-04  
**Branch:** `main`  
**Commits ahead of upstream:** 16  
**Target device:** Samsung Galaxy A56 (Android 15, 1080×2340)

---

## What Has Been Implemented

### Phase 1: Capacitor WebView Shell ✅ COMPLETE

**Commit `de15701` — "feat: add android capacitor shell"**

| Item | Status | Details |
|------|--------|---------|
| Capacitor installed | ✅ | v7.6.7 (core, cli, android) — chosen for Node 20 compat |
| `capacitor.config.ts` | ✅ | appId `com.mertgoevse.boltdiyandroid`, webDir `build/client`, debug flags, splash screen |
| Android project scaffolded | ✅ | `cap add android` — Gradle, MainActivity, manifests, resources, splash icons |
| npm scripts | ✅ | 7 scripts: `android:init`, `android:sync`, `android:copy`, `android:open`, `android:build`, `android:run`, `android:clean` |
| `cap copy android` tested | ✅ | Web assets copy to `android/app/src/main/assets/public/` successfully |

### Adapter Layer (Phase 0) ✅ COMPLETE

**6 files in `app/lib/adapters/`:**

| File | Purpose | Lines |
|------|---------|-------|
| `types.ts` | `PlatformAdapter`, `FilesystemAdapter`, `TerminalAdapter`, `PreviewAdapter` interfaces | 85 |
| `platform.ts` | `isCapacitor()`, `isElectron()`, `isWebContainerSupported()`, `getPlatformInfo()` | 95 |
| `android-adapter.ts` | `AndroidAdapter` — no-op terminal, empty preview, stub FS | 180 |
| `webcontainer-adapter.ts` | `WebContainerAdapter` — wraps real `@webcontainer/api` | 160 |
| `index.ts` | Factory: `getAdapter()` picks adapter based on platform at runtime | 55 |
| `README.md` | Adapter layer documentation | 75 |

### Store Fallback Guards ✅ COMPLETE

| File | Change | Behavior on Android |
|------|--------|---------------------|
| `app/lib/webcontainer/index.ts` | Guarded boot — checks `isWebContainerSupported()` before calling `WebContainer.boot()` | Returns null promise instead of crashing |
| `app/lib/stores/terminal.ts` | `#isFallbackMode` flag, skips `webcontainer.spawn()` when true | Terminal tabs render empty, no crash |
| `app/lib/stores/files.ts` | `#isFallbackMode` flag, updates in-memory nanostores map when true | File tree updates work, no WebContainer FS persistence |

### Runtime Adapter Layer (Phase 1) ✅ COMPLETE

**Commit `d13332c` — "feat: add runtime adapter layer"**

| File | Purpose |
|------|---------|
| `src/mobile/adapters/runtime/RuntimeAdapter.ts` | High-level interface: boot, FS, terminal, commands, dev server, preview, capabilities |
| `src/mobile/adapters/runtime/WebContainerRuntimeAdapter.ts` | Desktop: delegates to `@webcontainer/api` |
| `src/mobile/adapters/runtime/AndroidFallbackRuntimeAdapter.ts` | Android: in-memory FS, stub terminal, unsupported messages |
| `src/mobile/adapters/runtime/index.ts` | Factory: `getRuntimeAdapter()`, `hasFullRuntime()`, `isFallbackMode()` |

### Android Runtime Fallback Mode ✅ COMPLETE

**Commit `aa05bed` — "feat: add android runtime fallback mode"**

| File | Purpose |
|------|---------|
| `app/lib/stores/runtime-mode.ts` | Runtime mode store: detects platform, persists mode override + remote URL, capability flags |
| `app/components/mobile/RuntimeModeBanner.tsx` | Dismissible amber banner in chat: explains fallback mode |
| `app/components/@settings/tabs/runtime/RuntimeModeTab.tsx` | Settings tab: mode selection, remote URL input, capability matrix |
| `app/components/@settings/core/types.ts` | Added 'runtime' tab type |
| `app/components/@settings/core/constants.tsx` | Added runtime tab icon, label, description, default config |
| `app/components/@settings/core/ControlPanel.tsx` | Wired RuntimeModeTab into getTabComponent |
| `app/components/chat/BaseChat.tsx` | RuntimeModeBanner at top of chat column |

### GitHub Sync Panel ✅ COMPLETE

**Commit (this) — "feat: add mobile github sync panel"**

| File | Purpose |
|------|---------|
| `app/lib/stores/github-sync.ts` | GitHub sync store: repo URL, branch, sync status, uncommitted count |
| `app/components/mobile/GitHubSyncPanel.tsx` | Mobile-friendly sync panel: config, status, disabled commit/push buttons with explanations |
| `app/components/@settings/tabs/github/GitHubTab.tsx` | Added GitHubSyncPanel section below existing GitHub integration |
| `README_ANDROID.md` | Added GitHub setup docs: token connection, commit/push limitations, troubleshooting, TODO |

### Documentation ✅ COMPLETE

| File | Content |
|------|---------|
| `PORTING_REPORT.md` | Full dependency audit: 8 sections covering WebContainer (11 imports), terminal (5 files), FS (22 call sites), Electron (isolated), keyboard shortcuts (14 files), fixed layouts (11 issues), unsupported WebView APIs (6), 33 server-side API routes |
| `TODO_NEXT.md` | 6-phase implementation plan with checkboxes, build commands, dependency notes |
| `README_ANDROID.md` | Beginner setup guide: prerequisites, install, build, sync, open, device testing |
| `src/mobile/adapters/README.md` | Adapter architecture, interface definitions, exact file change list (~45 files across phases), dependency disposition |
| `app/lib/adapters/README.md` | Adapter layer usage docs with code examples |

---

## Current Architecture

```
bolt-diy-android/
├── app/                         # Remix/Vite web app (unchanged from upstream)
│   ├── lib/
│   │   ├── adapters/            # NEW — platform abstraction layer
│   │   │   ├── types.ts         #   PlatformAdapter interface
│   │   │   ├── platform.ts      #   Runtime detection (Capacitor/Android/touch/SAB)
│   │   │   ├── android-adapter.ts     #   Fallback for Android
│   │   │   ├── webcontainer-adapter.ts #  Wraps @webcontainer/api
│   │   │   └── index.ts         #   Factory: getAdapter()
│   │   ├── webcontainer/
│   │   │   └── index.ts         # MODIFIED — guarded boot
│   │   └── stores/
│   │       ├── terminal.ts      # MODIFIED — fallback mode
│   │       └── files.ts         # MODIFIED — fallback mode
│   ├── components/              # UI components (UNCHANGED — Phase 2 will modify)
│   ├── routes/                  # 33 API routes + pages (UNCHANGED — Phase 5 will modify)
│   └── styles/
│       └── variables.scss       # CSS vars (UNCHANGED — Phase 2 will add mobile overrides)
├── android/                     # NEW — Capacitor native Android project
│   ├── app/
│   │   ├── build.gradle         #   compileSdk 35, minSdk 23, targetSdk 35
│   │   ├── src/main/
│   │   │   ├── AndroidManifest.xml
│   │   │   ├── java/com/mertgoevse/boltdiyandroid/MainActivity.java
│   │   │   └── res/             #   icons, splash, strings, styles
│   │   └── ...
│   ├── build.gradle
│   ├── variables.gradle
│   └── settings.gradle
├── capacitor.config.ts          # NEW — Capacitor config
├── PORTING_REPORT.md            # NEW — dependency audit
├── TODO_NEXT.md                 # NEW — phased plan
├── README_ANDROID.md            # NEW — setup guide
├── src/mobile/adapters/         # NEW — mobile adapter docs
│   └── README.md
└── package.json                 # MODIFIED — Capacitor deps + 7 android scripts
```

**Key principle:** All changes are additive or guarded. The desktop web app runs identically to upstream. Adapters only activate when `isCapacitor()` or `!isWebContainerSupported()` returns true.

---

## Android / Capacitor / WebView Status

| Aspect | Status | Notes |
|--------|--------|-------|
| Capacitor installed | ✅ Working | v7.6.7, `cap copy` succeeds |
| Android project | ✅ Scaffolded | `com.mertgoevse.boltdiyandroid`, minSdk 23, targetSdk 35 |
| Web build → Android | ✅ Pipeline exists | `npm run android:sync` → `android:webbuild` → `cap sync android` |
| WebContainer on Android | ❌ Not available | SharedArrayBuffer unsupported in WebView — guarded, app doesn't crash |
| Terminal on Android | ⚠️ Polished fallback | Replaces empty xterm with designed screen & settings redirection |
| File system on Android | ✅ IndexedDB persistence | In-memory store + IndexedDB auto-save/restore across restarts |
| Android WebView shell | ✅ Real UI loads | `android:webbuild` → `build/client/index.html` → Capacitor |
| Preview on Android | ⚠️ Basic static preview | Designed fallback screen; supports local static HTML (`index.html`) preview |
| LLM chat on Android | ❌ Not working | 33 server-side API routes have no server in WebView |
| Mobile UI | ❌ Not started | Desktop layouts break at 360px (533px min-width, 1200px modal) |
| APK build | ✅ Automated | `android:apk:debug` compiles the debug APK via Gradle wrapper |
| Device tested | ❌ Not yet | No physical device testing done |

---

## Known Limitations

1. **No LLM chat** — The app's core feature (AI chat) requires server-side API routes (`api.chat.ts`, `api.llmcall.ts`, etc.) which don't exist in a WebView. This is the #1 blocker for a usable app.

2. **Live preview fallback** — Dev server preview is unavailable without WebContainer/Remote Runtime, but a designed fallback view is shown, and the user can run a basic static preview of any local `index.html` file using local Blob URLs.

3. **Terminal fallback** — The terminal cannot run a local shell process without WebContainer, but it now shows a designed fallback screen with redirection to Remote Runtime settings.

4. **IndexedDB file persistence** — Files created by AI actions are saved to IndexedDB and restored on app restart. In-memory store is always in sync with IndexedDB.

5. **Desktop layout breaks on mobile** — `--chat-min-width: 533px` forces horizontal scroll. Settings modal is 1200px wide. `react-resizable-panels` doesn't support touch resize. `react-dnd` with `HTML5Backend` doesn't work on touchscreens.

6. **No git operations** — `isomorphic-git` uses WebContainer FS as backend. Without WC, git clone/commit/push all fail. The GitHub Sync panel shows configuration but commit/push buttons are disabled with explanations.

7. **Screenshot selector broken** — Uses `navigator.mediaDevices.getDisplayMedia()` which doesn't exist in Android WebView.

8. **Speech recognition unreliable** — `webkitSpeechRecognition` may not be available in all Android WebView versions.

10. **Android build workflow** — The Android build workflow is now fully automated. `npm run android:apk:debug` compiles the debug APK containing the fully functional SPA build.

---

## Broken or Unfinished Parts

| Component | State | Fix Required |
|-----------|-------|-------------|
| `build/client/` | ✅ Complete | Vite SPA build generates real React SPA assets correctly |
| LLM chat (`api.chat.ts`) | No server in WebView | Phase 5: remote proxy or Capacitor HTTP client |
| Model listing (`api.models.ts`) | No server in WebView | Phase 5: client-side or proxy |
| Preview iframe | ✅ Complete | Designed fallback and local static HTML preview implemented |
| Terminal process | ✅ Complete | Designed fallback and settings redirection implemented |
| File system persistence | ✅ Complete | InMemoryFS with IndexedDB backing automatically saves and restores files |
| Git operations | FS backend missing | Phase 3: InMemoryFS for isomorphic-git. GitHub Sync panel saves config only |
| Settings modal | 1200px fixed width | Phase 2: `w-full max-w-[1200px]` |
| Chat layout | Forces 533px min width | Phase 2: responsive CSS override |
| DnD (file tree, chat) | HTML5 backend, no touch | Phase 2: switch to `react-dnd-touch-backend` |
| Screenshot selector | `getDisplayMedia` unavailable | Phase 2: hide on mobile |
| Keyboard shortcuts | No Ctrl/Cmd on mobile | Phase 2: no-op on mobile |
| `package-lock.json` | Untracked | Can remain untracked or added to gitignore |

---

## Exact Next Implementation Steps

### Phase 2: Mobile UI (immediate next)

1. **`app/styles/variables.scss`** — Add media query: `@media (max-width: 768px) { --chat-min-width: 100%; --workbench-width: 100%; --workbench-left: 0; }`

2. **`app/components/chat/BaseChat.tsx`** — Stack chat above workbench on mobile (not `lg:flex-row`). Reduce `mt-[16vh]` to `mt-[8vh]` on mobile. Hide `ScreenshotSelector` when `isCapacitor()`. Feature-detect `SpeechRecognition`.

3. **`app/components/@settings/core/ControlPanel.tsx`** — Change `w-[1200px] h-[90vh]` to `w-full max-w-[1200px] h-full md:h-[90vh]`.

4. **`app/components/workbench/EditorPanel.tsx`** — On mobile: replace `PanelGroup`/`PanelResizeHandle` with tab-based switching (Editor | Files | Terminal).

5. **`app/components/workbench/FileTree.tsx`** — Wrap in collapsible drawer on mobile (slide from left).

6. **`app/components/workbench/terminal/TerminalTabs.tsx`** — Wrap in bottom slide-up drawer on mobile.

7. **`app/components/workbench/Preview.tsx`** — Fullscreen mode on mobile, no device frame.

8. **`app/root.tsx`** — Replace `HTML5Backend` with `TouchBackend` from `react-dnd-touch-backend` (or conditional).

9. **`app/lib/hooks/useShortcuts.ts`** — Early return when `isCapacitor()` or touch-only.

10. **NEW `app/components/mobile/BottomNav.tsx`** — Bottom tab bar: Chat, Files, Preview, Settings.

11. **NEW `app/styles/mobile.scss`** — Mobile-specific CSS overrides.

12. **Commit:** `feat: mobile-first responsive UI`

### Phase 3: Filesystem Adapter

1. Create `app/lib/adapters/in-memory-fs.ts` — implements `mkdir`, `writeFile`, `readFile`, `readdir`, `rm` with localStorage/IndexedDB backing.
2. Update `FilesStore` fallback to use `InMemoryFS`.
3. Update `useGit.ts` to use `InMemoryFS` as `isomorphic-git` FS backend.
4. Update `action-runner.ts` to route file ops through adapter.
5. Update `Search.tsx` to search in-memory contents.
6. **Commit:** `feat: in-memory filesystem adapter for Android`

### Phase 4: Terminal/Preview Adapter

1. Create `app/lib/adapters/terminal-adapter.ts` — `NullTerminalAdapter` with fallback message.
2. Update `TerminalStore` to use adapter instead of direct WC spawn.
3. Update `Terminal.tsx` to show "Terminal not available on mobile".
4. Update `Preview.tsx` to show "Preview not available on mobile".
5. No-op `shell.ts` functions when WC unavailable.
6. **Commit:** `feat: terminal and preview fallback for mobile`

### Phase 5: Remote Runtime Design & Scaffold ✅ COMPLETE

1. **Commit `66d0dc0` — "feat: scaffold remote runtime client"**
2. **Commit `5f8b651` — "feat: scaffold secure remote runtime server"**
3. **Commit [HEAD] — "feat: connect android settings to remote runtime"**
4. Created `docs/REMOTE_RUNTIME.md` detailing the secure API contract and WS events.
5. Implemented `RemoteRuntimeClient.ts` with health check, workspace stubs, and single-file write methods.
6. Connected Settings UI on Android to execute live `/health` status tests and `/workspace` creations.
7. Workspace ID configuration is successfully persisted and connection state indicators render in UI.

### Phase 6: APK Build & Polish ⚠️ PARTIAL

1. **Commit `b00648c` — "feat: add branding preview and apk build workflow"**
2. Set up automated build scripts (`scripts/build-apk.mjs` with automatic JVM 21/SDK discovery).
3. Successfully compiled debug APK (`npm run android:apk:debug` generating `app-debug.apk`).
4. Production release signing config is pending.

---

## Git State

```
[HEAD] feat: connect android settings to remote runtime
5f8b651 feat: scaffold secure remote runtime server
e94c805 chore: verify remote runtime scaffold
66d0dc0 feat: scaffold remote runtime client
6fd6a2e docs: add github repository metadata guide
```

**Remote:** `origin → https://github.com/mertgoevse-wq/bolt-diy-android.git`
- Push is fully working.

---

## Branding Pass ✅ COMPLETE

**Commit: `b00648c` — "feat: add branding preview and apk build workflow"**

| Item | Status | Details |
|------|--------|---------|
| Project name | ✅ | `bolt-diy-android` |
| Display name | ✅ | `bolt.diy Android` |
| Android package | ✅ | `com.mertgoevse.boltdiyandroid` |
| README.md | ✅ | Replaced with Android-port README and branding preview |
| NOTICE.md | ✅ | Attribution and copyright |
| BRANDING.md | ✅ | `BRANDING.md` |
| New logo SVG | ✅ | `public/bolt-diy-android-logo.svg` |
| New app icon SVG | ✅ | `public/bolt-diy-android-icon.svg` |
| Social preview banner | ✅ | `public/bolt-diy-android-social-preview.svg` |
| Android strings.xml | ✅ | App name → `bolt.diy Android` |
| Android build.gradle | ✅ | namespace + applicationId updated |
| MainActivity.java | ✅ | Moved to `com/mertgoevse/boltdiyandroid/` |
| capacitor.config.ts | ✅ | appId + appName updated |
| package.json | ✅ | name, description, author, contributors |
| Original LICENSE | ✅ | Retained unchanged |
| Original logos | ✅ | Not deleted, not claimed as owned |
