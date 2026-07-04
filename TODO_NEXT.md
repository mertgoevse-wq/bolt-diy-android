# TODO: Next Steps for Android Port

**Last updated:** 2026-07-04
**Current phase:** Phase 0, 1, 3, 4, 5.3, 6 (debug compile) complete; Phase 2 (mobile UI) and Phase 5b (AI provider integration) next.

---

## Phase 1: WebView Wrapper ✅ DONE

- [x] Install Capacitor (core, cli, android — v7 for Node 20 compat)
- [x] Create `capacitor.config.ts` (appId: `com.mertgoevse.boltdiyandroid`, webDir: `build/client`)
- [x] Run `cap add android` — native project scaffolded
- [x] Add npm scripts: `android:sync`, `android:open`, `android:build`, `android:run`, `android:copy`, `android:clean`, `android:init`
- [x] Create platform adapter layer (`app/lib/adapters/`)
- [x] Guard WebContainer boot in `app/lib/webcontainer/index.ts`
- [x] Add fallback mode to `TerminalStore` in `app/lib/stores/terminal.ts`
- [x] Add fallback mode to `FilesStore` in `app/lib/stores/files.ts`
- [x] Create `README_ANDROID.md`
- [x] Verify `cap copy android` works

---

## Phase 2: Mobile UI ⬅️ NEXT

**Goal:** Make the existing UI usable on a 360px wide touchscreen.

### 2a. Responsive CSS Variables
- [ ] Override `--chat-min-width` to `100%` on screens < 768px
- [ ] Override `--workbench-width` to `100%` on mobile
- [ ] Override `--header-height` to `56px` on mobile
- [ ] Add `--mobile-bottom-nav-height: 56px` for bottom navigation
- **Files:** `app/styles/variables.scss`, NEW `app/styles/mobile.scss`

### 2b. Chat Layout
- [ ] `BaseChat.tsx`: switch from `lg:flex-row` to stacked on mobile (chat on top, workbench below or as overlay)
- [ ] `BaseChat.tsx`: reduce `mt-[16vh]` to `mt-[8vh]` on mobile
- [ ] `BaseChat.tsx`: hide `ScreenshotSelector` when `isCapacitor()` or no `getDisplayMedia`
- [ ] `BaseChat.tsx`: feature-detect `SpeechRecognition` and hide button if unavailable
- **Files:** `app/components/chat/BaseChat.tsx`, `app/components/chat/BaseChat.module.scss`

### 2c. Settings Modal
- [ ] `ControlPanel.tsx`: change `w-[1200px] h-[90vh]` to `w-full max-w-[1200px] h-full md:h-[90vh]`
- [ ] Make tab list horizontal scrollable on mobile (instead of vertical sidebar)
- **Files:** `app/components/@settings/core/ControlPanel.tsx`

### 2d. Workbench Layout
- [ ] `Workbench.client.tsx`: on mobile, use full-width stacked layout instead of fixed positioning
- [ ] `EditorPanel.tsx`: replace `react-resizable-panels` with tab-based switching on mobile (Editor | Files | Terminal tabs)
- [ ] `FileTree.tsx`: make collapsible drawer (slide in from left)
- [ ] `TerminalTabs.tsx`: make slide-up drawer from bottom
- [ ] `Preview.tsx`: fullscreen mode on mobile (no device frame)
- **Files:** `app/components/workbench/Workbench.client.tsx`, `app/components/workbench/EditorPanel.tsx`, `app/components/workbench/FileTree.tsx`, `app/components/workbench/terminal/TerminalTabs.tsx`, `app/components/workbench/Preview.tsx`

### 2e. Drag & Drop
- [ ] `root.tsx`: switch from `HTML5Backend` to `TouchBackend` from `react-dnd-touch-backend`
- [ ] Or: conditionally use `HTML5Backend` on desktop, `TouchBackend` on mobile
- [ ] Install: `npm install react-dnd-touch-backend --legacy-peer-deps`
- **Files:** `app/root.tsx`, `package.json`

### 2f. Bottom Navigation
- [ ] Create `app/components/mobile/BottomNav.tsx` with tabs: Chat, Files, Preview, Settings
- [ ] Show only on mobile (`isCapacitor()` or `max-width: 768px`)
- [ ] Wire to view switching (chat ↔ workbench ↔ settings)
- **Files:** NEW `app/components/mobile/BottomNav.tsx`, `app/components/workbench/Workbench.client.tsx`

### 2g. Keyboard Shortcuts
- [ ] `useShortcuts.ts`: skip all shortcuts when `isCapacitor()` or touch-only
- [ ] Don't remove the hook — just make it a no-op on mobile
- **Files:** `app/lib/hooks/useShortcuts.ts`

### 2h. Commit Checkpoint
- [ ] Run typecheck: `npx tsc --noEmit`
- [ ] Run build: `npm run build`
- [ ] Run `npm run android:sync` and test on device
- [ ] Commit: `feat: mobile-first responsive UI`

---

## Phase 3: Filesystem Adapter ✅ DONE

**Goal:** Make file operations work without WebContainer using an in-memory filesystem.

- [x] Create `app/lib/adapters/in-memory-fs.ts`:
  - [x] Implement `mkdir`, `writeFile`, `readFile`, `readdir`, `rm`, `rename`, `exists`
  - [x] Match WebContainer FS API signatures
  - [x] Store data in nanostores map (already partially done in FilesStore fallback)
- [x] Update `FilesStore` fallback to use `InMemoryFS` instead of just updating the map
- [x] Update `useGit.ts` to use `InMemoryFS` as the `isomorphic-git` FS backend
- [x] Update `action-runner.ts` to use adapter FS for file write actions
- [x] Update `Search.tsx` to search in-memory file contents
- [x] Add file export/import via `file-saver` + `jszip` (already available)
- [x] **Commit:** `feat: in-memory filesystem adapter for Android`

---

## Phase 4: Terminal & Preview Adapter ✅ DONE

**Goal:** Graceful fallback for terminal and preview features.

### Terminal
- [x] Create `app/lib/adapters/terminal-adapter.ts`:
  - [x] Define `TerminalAdapter` interface (write, read, resize, kill)
  - [x] `NullTerminalAdapter` — shows "Terminal not available on mobile" message
  - [x] Future: `CapacitorTerminalAdapter` using Termux or SSH plugin
- [x] Update `TerminalStore` to use adapter instead of direct WebContainer spawn
- [x] Update `TerminalTabs.tsx` to show fallback message when no terminal
- [x] Update `shell.ts` to no-op when WebContainer unavailable
- [x] **Commit:** `feat: terminal fallback adapter`

### Preview
- [x] Update `PreviewsStore` to detect no-WebContainer and show empty state
- [x] Update `Preview.tsx` to show "Preview not available on mobile" when no previews
- [x] Future: static HTML preview from in-memory files (open in new WebView)
- [x] **Commit:** `feat: preview fallback for mobile`

---

## Phase 5a: Remote Runtime Design & Scaffold ✅ DONE

**Goal:** Scaffold a safe, authenticated Remote Runtime interface for terminal execution and preview tunneling on mobile.

- [x] Create `docs/REMOTE_RUNTIME.md` defining API contract & WebSocket streams
- [x] Implement `RemoteRuntimeClient.ts` with health-check, workspace stubs, and preview URL methods
- [x] Integrate Auth Token, Workspace ID, and URL fields in Runtime Settings UI
- [x] Add connection testing trigger checking GET /health
- [x] **Commit:** `feat: scaffold remote runtime client`

---

## Phase 5.3: Remote Runtime File Sync MVP ✅ DONE

**Goal:** Sync local Android IndexedDB text files to/from an optional Remote Runtime without enabling shell command execution.

- [x] Create `app/lib/remote-runtime/RemoteWorkspaceSync.ts`
  - [x] `pushLocalWorkspaceToRemote()`
  - [x] `pullRemoteWorkspaceToLocal()`
  - [x] `syncSingleFileToRemote()`
  - [x] `getSyncStatus()`
  - [x] `resetSyncStatus()`
- [x] Keep IndexedDB local Android storage as the source of truth
- [x] Push all local text files to Remote Runtime
- [x] Pull remote text files only after user action
- [x] Keep local files by default on conflict and record conflicts in sync status
- [x] Skip binary files with clear warnings
- [x] Strengthen `RemoteRuntimeClient.ts` list/read/write/sync typings and errors
- [x] Harden remote-runtime file API for nested directories, path traversal, JSON errors, and text-safe payloads
- [x] Add sync controls/status to Android Settings and Runtime Mode UI
- [x] Update docs with LAN setup guidance: `REMOTE_RUNTIME_HOST=0.0.0.0`, `REMOTE_RUNTIME_PORT=8787`, and `http://192.168.x.x:8787`
- [x] **Commit:** `feat: add remote runtime file sync`

---

## Phase 5b: AI Provider Integration

**Goal:** Make LLM chat work without a Remix server.

### Approach A: Remote Proxy (Recommended)
- [ ] Deploy bolt.diy to Cloudflare Pages (as-is)
- [ ] In the Android app, point API calls to the deployed URL
- [ ] Create `app/lib/adapters/api-client.ts` that redirects `fetch('/api/chat')` to `fetch('https://your-app.pages.dev/api/chat')`
- [ ] This preserves all server-side logic (streaming, prompt construction, etc.)

### Approach B: Client-Side LLM Calls
- [ ] Create `app/lib/adapters/llm-stream.ts` using `ai` SDK's client-side streaming
- [ ] Convert `api.chat.ts` logic to run in the browser
- [ ] Use Capacitor HTTP plugin to bypass CORS restrictions
- [ ] Risk: API keys exposed in client bundle

### Tasks (Either Approach)
- [ ] Create `app/lib/adapters/api-client.ts` — intercepts fetch calls to `/api/*`
- [ ] Update `Chat.client.tsx` to use adapter API client
- [ ] Update `ModelSelector.tsx` to use adapter for model listing
- [ ] Update `api.check-env-key.ts` consumer to use adapter
- [ ] Update `api.configured-providers.ts` consumer to use adapter
- [ ] Test LLM streaming end-to-end on device
- [ ] **Commit:** `feat: client-side API adapter for Android`

---

## Phase 6: APK Build & Polish ⚠️ PARTIAL

**Goal:** Produce a distributable APK and automate build pipelines.

- [x] Set up automated build scripts (`scripts/build-apk.mjs` with automatic JVM 21/SDK discovery)
- [x] Successfully compile debug APK (`npm run android:apk:debug` generating `app-debug.apk`)
- [ ] Create `android/app/src/main/res/xml/network_security_config.xml` for dev cleartext
- [ ] Configure `android/app/build.gradle`:
  - Set `minSdkVersion` to 24 (Android 7.0 — covers Galaxy A56)
  - Set `targetSdkVersion` to 35 (Android 15)
  - Add signing config for release builds
- [ ] Update `AndroidManifest.xml`:
  - Add `android:usesCleartextTraffic="true"` for dev
  - Add `android:configChanges` for orientation handling
  - Consider `android:screenOrientation` lock or responsive handling
- [ ] Generate app icons (use `@capacitor/assets` or manual)
- [ ] Set correct app name in `strings.xml`
- [ ] Build release APK: `npm run android:build`
- [ ] Test on Samsung Galaxy A56
- [ ] **Commit:** `feat: production APK build configuration`

---

## Quick Reference: Build Commands

```bash
# Install
npm install --legacy-peer-deps

# Development (web)
npm run dev

# Development (Android, live reload)
# 1. Start dev server: npm run dev
# 2. Set server.url in capacitor.config.ts to your IP:5173
# 3. npm run android:copy && npm run android:open

# Build APK
npm run android:build

# Sync web build to Android
npm run android:sync

# Open in Android Studio
npm run android:open

# Run on connected device
npm run android:run
```

---

## Dependency Notes

| Package | Keep on Android? | Reason |
|---------|-----------------|--------|
| `@webcontainer/api` | Yes (guarded) | Import types, but never boot |
| `@xterm/*` | Yes | Terminal UI renders; no process attached |
| `react-resizable-panels` | Yes (conditional) | Use tabs on mobile instead |
| `react-dnd` + `HTML5Backend` | Replace with TouchBackend | HTML5 DnD doesn't work on touch |
| `electron` (devDep) | Yes (unused) | Only loaded in Electron build |
| `isomorphic-git` | Yes | Needs InMemoryFS adapter (Phase 3) |
| `file-saver` | Yes | Works in WebView |
| `jszip` | Yes | Pure JS, works everywhere |
| `framer-motion` | Yes | Works in WebView |
| `chart.js` / `react-chartjs-2` | Yes | Works in WebView |
| `react-hotkeys-hook` | Keep but no-op | No Ctrl/Cmd on mobile keyboards |
