# bolt.diy Android — Current Status

**Last updated:** 2026-07-04  
**Branch:** `main`  
**Commits ahead of upstream:** 10  
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
| Web build → Android | ✅ Pipeline exists | `npm run android:sync` → `remix vite:build` → `cap sync android` |
| WebContainer on Android | ❌ Not available | SharedArrayBuffer unsupported in WebView — guarded, app doesn't crash |
| Terminal on Android | ⚠️ Fallback only | xterm renders but no shell process; shows empty terminal |
| File system on Android | ✅ IndexedDB persistence | In-memory store + IndexedDB auto-save/restore across restarts |
| Android WebView shell | ✅ Real UI loads | `android:webbuild` → `build/client/index.html` → Capacitor |
| Preview on Android | ❌ No preview | No WebContainer = no preview server; iframe has no URL |
| LLM chat on Android | ❌ Not working | 33 server-side API routes have no server in WebView |
| Mobile UI | ❌ Not started | Desktop layouts break at 360px (533px min-width, 1200px modal) |
| APK build | ⚠️ Config exists | `cap build android` works but produces debug APK with placeholder content |
| Device tested | ❌ Not yet | No physical device testing done |

---

## Known Limitations

1. **No LLM chat** — The app's core feature (AI chat) requires server-side API routes (`api.chat.ts`, `api.llmcall.ts`, etc.) which don't exist in a WebView. This is the #1 blocker for a usable app.

2. **No live preview** — WebContainer provides the dev server preview. Without it, the Preview tab shows nothing.

3. **No terminal** — The terminal tabs render but have no shell process. Users see an empty xterm instance.

4. **IndexedDB file persistence** — Files created by AI actions are saved to IndexedDB and restored on app restart. In-memory store is always in sync with IndexedDB.

5. **Desktop layout breaks on mobile** — `--chat-min-width: 533px` forces horizontal scroll. Settings modal is 1200px wide. `react-resizable-panels` doesn't support touch resize. `react-dnd` with `HTML5Backend` doesn't work on touchscreens.

6. **No git operations** — `isomorphic-git` uses WebContainer FS as backend. Without WC, git clone/commit/push all fail. The GitHub Sync panel shows configuration but commit/push buttons are disabled with explanations.

7. **Screenshot selector broken** — Uses `navigator.mediaDevices.getDisplayMedia()` which doesn't exist in Android WebView.

8. **Speech recognition unreliable** — `webkitSpeechRecognition` may not be available in all Android WebView versions.

9. **Keyboard shortcuts don't fire** — `useShortcuts.ts` listens for Ctrl/Cmd combos; Android soft keyboards don't have these keys.

10. **Placeholder web content** — `build/client/index.html` is a placeholder. A real `npm run build` hasn't been executed yet (requires working Remix build environment).

---

## Broken or Unfinished Parts

| Component | State | Fix Required |
|-----------|-------|-------------|
| `build/client/` | Placeholder HTML only | Run `npm run build` to produce real Remix output |
| LLM chat (`api.chat.ts`) | No server in WebView | Phase 5: remote proxy or Capacitor HTTP client |
| Model listing (`api.models.ts`) | No server in WebView | Phase 5: client-side or proxy |
| Preview iframe | No URL to load | Phase 4: fallback message or static preview |
| Terminal process | No shell to spawn | Phase 4: fallback message |
| File persistence | In-memory only | Phase 3: InMemoryFS with localStorage/IndexedDB backing |
| Git operations | FS backend missing | Phase 3: InMemoryFS for isomorphic-git. GitHub Sync panel saves config only |
| Settings modal | 1200px fixed width | Phase 2: `w-full max-w-[1200px]` |
| Chat layout | Forces 533px min width | Phase 2: responsive CSS override |
| DnD (file tree, chat) | HTML5 backend, no touch | Phase 2: switch to `react-dnd-touch-backend` |
| Screenshot selector | `getDisplayMedia` unavailable | Phase 2: hide on mobile |
| Keyboard shortcuts | No Ctrl/Cmd on mobile | Phase 2: no-op on mobile |
| `package-lock.json` | Untracked, generated by npm | Should be committed or gitignored |

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

### Phase 5: AI Provider Integration

1. Choose approach: **A)** Deploy Remix to Cloudflare Pages, proxy API calls; **B)** Client-side LLM via Capacitor HTTP.
2. Create `app/lib/adapters/api-client.ts` — intercepts `/api/*` fetch calls.
3. Convert critical routes: `api.chat.ts`, `api.llmcall.ts`, `api.models.ts`, `api.enhancer.ts`.
4. Test LLM streaming end-to-end.
5. **Commit:** `feat: client-side API adapter for Android`

### Phase 6: APK Build

1. Configure `AndroidManifest.xml` (permissions, orientation, cleartext).
2. Set minSdk 24, add signing config in `build.gradle`.
3. Generate app icons.
4. Build release APK: `npm run android:build`.
5. Test on Samsung Galaxy A56.
6. **Commit:** `feat: production APK build configuration`

---

## Git State

```
046ef5c docs: add android porting audit          ← HEAD
de15701 feat: add android capacitor shell
2e254ac feat: add web URL content fetcher         ← origin/main (upstream)
```

**Remote:** `origin → https://github.com/stackblitz-labs/bolt.diy.git`
- This is the **upstream repository**, not a fork.
- Push requires: (1) a fork or new repo, (2) GitHub authentication.
- See "Push Status" section below.

---

## Branding Pass ✅ COMPLETE

**Commit: `chore: rebrand as bolt-diy-android`**

| Item | Status | Details |
|------|--------|---------|
| Project name | ✅ | `bolt-diy-android` |
| Display name | ✅ | `bolt.diy Android` |
| Android package | ✅ | `com.mertgoevse.boltdiyandroid` |
| README.md | ✅ | Replaced with Android-port README |
| NOTICE.md | ✅ | Attribution and copyright |
| BRANDING.md | ✅ | `docs/branding/BRANDING.md` |
| New logo SVG | ✅ | `public/bolt-diy-android-logo.svg` |
| New app icon SVG | ✅ | `public/bolt-diy-android-icon.svg` |
| Android strings.xml | ✅ | App name → `bolt.diy Android` |
| Android build.gradle | ✅ | namespace + applicationId updated |
| MainActivity.java | ✅ | Moved to `com/mertgoevse/boltdiyandroid/` |
| capacitor.config.ts | ✅ | appId + appName updated |
| package.json | ✅ | name, description, author, contributors |
| Original LICENSE | ✅ | Retained unchanged |
| Original logos | ✅ | Not deleted, not claimed as owned |
