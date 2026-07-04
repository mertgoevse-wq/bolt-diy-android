# Mobile Adapters — Architecture & File Change List

This directory documents the mobile adapter layer for the bolt.diy Android port.
The actual adapter implementations live at `app/lib/adapters/` (created in Phase 1)
and will migrate here as the codebase restructures for mobile-first.

---

## Adapter Architecture

```
src/mobile/adapters/          ← this directory (documentation + planned code)
├── README.md                 ← you are here
├── platform.ts               ← [PLANNED] move from app/lib/adapters/platform.ts
├── types.ts                  ← [PLANNED] move from app/lib/adapters/types.ts
├── android-adapter.ts        ← [PLANNED] move from app/lib/adapters/android-adapter.ts
├── webcontainer-adapter.ts   ← [PLANNED] move from app/lib/adapters/webcontainer-adapter.ts
├── in-memory-fs.ts           ← [PLANNED Phase 3] In-memory filesystem
├── terminal-adapter.ts       ← [PLANNED Phase 4] Terminal fallback
├── api-client.ts             ← [PLANNED Phase 5] API route replacement
└── llm-stream.ts             ← [PLANNED Phase 5] Client-side LLM streaming

Current implementation:
app/lib/adapters/             ← Phase 1 adapters (working)
├── types.ts                  ← PlatformAdapter, FilesystemAdapter, TerminalAdapter, PreviewAdapter
├── platform.ts               ← isCapacitor(), isWebContainerSupported(), getPlatformInfo()
├── android-adapter.ts        ← AndroidAdapter: no-op terminal, empty preview, stub FS
├── webcontainer-adapter.ts   ← WebContainerAdapter: wraps real @webcontainer/api
├── index.ts                  ← Factory: getAdapter() picks based on platform
└── README.md                 ← Adapter layer docs
```

---

## PlatformAdapter Interface

```typescript
interface PlatformInfo {
  isAndroid: boolean;
  isCapacitor: boolean;
  isElectron: boolean;
  isTouch: boolean;
  isWebContainerSupported: boolean;
  hasSharedArrayBuffer: boolean;
}

interface PlatformAdapter {
  platform: PlatformInfo;
  filesystem: FilesystemAdapter;
  terminal: TerminalAdapter;
  preview: PreviewAdapter;
}

interface FilesystemAdapter {
  writeFile(path: string, data: string | Buffer): Promise<void>;
  readFile(path: string, encoding?: string): Promise<string>;
  readdir(path: string, opts?: { withFileTypes?: boolean }): Promise<DirEntry[]>;
  mkdir(path: string, opts?: { recursive?: boolean }): Promise<void>;
  rm(path: string, opts?: { recursive?: boolean }): Promise<void>;
}

interface TerminalAdapter {
  spawn(command: string, args: string[]): Promise<TerminalProcess>;
  resize(cols: number, rows: number): void;
  kill(): void;
}

interface PreviewAdapter {
  getUrl(port: number): string | null;
  reload(): void;
  isAvailable: boolean;
}
```

---

## Detection Logic

`platform.ts` checks at runtime:

| Check | Method | Purpose |
|-------|--------|---------|
| Capacitor | `window.Capacitor?.getPlatform() === 'android'` | Native Android shell |
| Android WebView | UA contains `Android` + `wv` | Fallback detection |
| Touch device | `'ontouchstart' in window \|\| navigator.maxTouchPoints > 0` | UI mode |
| SharedArrayBuffer | `typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated` | WebContainer viability |
| WebContainer | `!SSR && hasSAB && !isCapacitor && !isAndroid` | Master switch |

---

## Exact Files That Must Change

### Already Modified (Phase 1 — no breaking changes)

| File | Change | Safe? |
|------|--------|-------|
| `app/lib/webcontainer/index.ts` | Guarded boot — returns null instead of crashing on Android | ✅ No-op on desktop |
| `app/lib/stores/terminal.ts` | Added `#isFallbackMode` flag, skips WebContainer spawn when true | ✅ No-op on desktop |
| `app/lib/stores/files.ts` | Added `#isFallbackMode` flag, updates in-memory map when true | ✅ No-op on desktop |
| `capacitor.config.ts` | New file — Capacitor Android config | ✅ Additive |
| `package.json` | Added 7 `android:*` scripts, Capacitor deps | ✅ Additive |
| `.gitignore` | Added Android build artifacts | ✅ Additive |

### Phase 2: Mobile UI (15 files)

| File | Required Change | Risk |
|------|-----------------|------|
| `app/styles/variables.scss` | Override `--chat-min-width`, `--workbench-width` for <768px | Low — CSS media query |
| `app/components/chat/BaseChat.tsx` | Stack layout on mobile, hide ScreenshotSelector, feature-detect SpeechRecognition | Medium — core layout |
| `app/components/chat/BaseChat.module.scss` | Mobile responsive overrides | Low |
| `app/components/@settings/core/ControlPanel.tsx` | `w-full max-w-[1200px]` instead of `w-[1200px]` | Low |
| `app/components/workbench/Workbench.client.tsx` | Mobile layout (full-width, stacked) | Medium — complex layout |
| `app/components/workbench/EditorPanel.tsx` | Tab-based panel switching on mobile (no resizable panels) | Medium |
| `app/components/workbench/FileTree.tsx` | Collapsible drawer on mobile | Low |
| `app/components/workbench/terminal/TerminalTabs.tsx` | Bottom drawer on mobile | Low |
| `app/components/workbench/Preview.tsx` | Fullscreen mode on mobile | Low |
| `app/components/ui/ColorSchemeDialog.tsx` | `min-w-[480px]` → `min-w-0 w-full max-w-[480px]` | Low |
| `app/root.tsx` | `HTML5Backend` → `TouchBackend` (or conditional) | Medium — global DnD |
| `app/lib/hooks/useShortcuts.ts` | No-op when `isCapacitor()` or touch-only | Low |
| `app/components/chat/SpeechRecognition.tsx` | Feature-detect, hide button if unavailable | Low |
| **NEW** `app/components/mobile/BottomNav.tsx` | Bottom tab navigation | Additive |
| **NEW** `app/styles/mobile.scss` | Mobile-specific CSS overrides | Additive |

### Phase 3: Filesystem Adapter (5 files)

| File | Required Change | Risk |
|------|-----------------|------|
| `app/lib/stores/files.ts` | Use `InMemoryFS` in fallback mode instead of just map updates | Medium |
| `app/lib/hooks/useGit.ts` | Use `InMemoryFS` as `isomorphic-git` FS backend | Medium |
| `app/lib/runtime/action-runner.ts` | Route file ops through adapter | Medium |
| `app/components/workbench/Search.tsx` | Search in-memory file contents | Low |
| **NEW** `app/lib/adapters/in-memory-fs.ts` | InMemoryFS implementation | Additive |

### Phase 4: Terminal/Preview Adapter (5 files)

| File | Required Change | Risk |
|------|-----------------|------|
| `app/lib/stores/terminal.ts` | Use terminal adapter instead of direct WebContainer spawn | Medium |
| `app/lib/stores/previews.ts` | Detect no-WebContainer, show empty state | Low |
| `app/components/workbench/terminal/Terminal.tsx` | Show fallback message when no terminal | Low |
| `app/components/workbench/Preview.tsx` | Show fallback when no previews | Low |
| `app/utils/shell.ts` | No-op when WebContainer unavailable | Low |

### Phase 5: AI Provider Integration (10 files)

| File | Required Change | Risk |
|------|-----------------|------|
| `app/routes/api.chat.ts` | Proxy or client-side replacement | **HIGH** — core feature |
| `app/routes/api.llmcall.ts` | Proxy or client-side | High |
| `app/routes/api.models.ts` | Client-side model listing | Medium |
| `app/routes/api.models.$provider.ts` | Client-side model listing | Medium |
| `app/routes/api.enhancer.ts` | Proxy or client-side | Medium |
| `app/routes/api.check-env-key.ts` | Client-side key check | Low |
| `app/routes/api.configured-providers.ts` | Client-side provider list | Low |
| `app/routes/api.web-search.ts` | Proxy or client-side | Medium |
| **NEW** `app/lib/adapters/api-client.ts` | Fetch wrapper / Capacitor HTTP | Additive |
| **NEW** `app/lib/adapters/llm-stream.ts` | Client-side streaming | Additive |

### Phase 6: APK Build (5 files)

| File | Required Change | Risk |
|------|-----------------|------|
| `capacitor.config.ts` | Production config (remove debug flags) | Low |
| `android/app/build.gradle` | Signing config, minSdk/targetSdk | Low |
| `android/app/src/main/AndroidManifest.xml` | Final permissions, orientation | Low |
| **NEW** `android/app/src/main/res/xml/network_security_config.xml` | Cleartext for dev | Additive |
| `android/app/src/main/res/values/strings.xml` | App name | Low |

**Total: ~45 files across all phases (15 already done, 30 remaining)**

---

## Phased Implementation Plan

### Phase 1: WebView Wrapper ✅ DONE
- Capacitor v7 installed (core, cli, android)
- `capacitor.config.ts` created (appId: `com.boltdiy.app`, webDir: `build/client`)
- Native Android project scaffolded
- Platform adapter layer created
- WebContainer boot guarded
- Terminal/Files stores have fallback mode
- npm scripts added
- **Commit:** `feat: add android capacitor shell`

### Phase 2: Mobile UI ⬅️ NEXT
- Responsive CSS variables for <768px
- Chat: stacked layout, hide unsupported features
- Settings: responsive modal (`w-full max-w-[1200px]`)
- Workbench: tab-based panel switching (no resizable panels on mobile)
- FileTree: collapsible left drawer
- Terminal: bottom slide-up drawer
- Preview: fullscreen mode
- DnD: switch to `react-dnd-touch-backend`
- Bottom navigation bar
- Keyboard shortcuts: no-op on mobile
- **Commit:** `feat: mobile-first responsive UI`

### Phase 3: Filesystem Adapter
- Create `InMemoryFS` implementing WebContainer FS API signatures
- Wire into FilesStore fallback mode
- Wire into `isomorphic-git` for git operations
- Wire into action-runner for AI file actions
- Update Search to scan in-memory files
- **Commit:** `feat: in-memory filesystem adapter for Android`

### Phase 4: Terminal/Preview Adapter
- Create terminal adapter interface with `NullTerminalAdapter`
- Show "Terminal not available on mobile" in terminal UI
- Show "Preview not available on mobile" in preview UI
- No-op shell.ts functions
- Future: Capacitor SSH/Termux plugin for real terminal
- **Commit:** `feat: terminal and preview fallback for mobile`

### Phase 5: AI Provider Integration
- **Approach A (recommended):** Deploy Remix app to Cloudflare Pages, proxy API calls
- **Approach B:** Client-side LLM calls via Capacitor HTTP plugin (bypasses CORS)
- Convert critical API routes: chat, llmcall, models, enhancer, check-env-key
- Test LLM streaming end-to-end on device
- **Commit:** `feat: client-side API adapter for Android`

### Phase 6: APK Build & Polish
- Configure AndroidManifest (permissions, orientation, cleartext)
- Set minSdk 24, targetSdk 35 in build.gradle
- Add signing config for release builds
- Generate app icons
- Build release APK
- Test on Samsung Galaxy A56
- **Commit:** `feat: production APK build configuration`

---

## Dependency Disposition

| Package | Android Action | Reason |
|---------|---------------|--------|
| `@webcontainer/api` | Keep (guarded) | Types still imported; boot is guarded |
| `@xterm/xterm` | Keep | Terminal UI renders; no process attached |
| `@xterm/addon-fit` | Keep | Terminal UI |
| `@xterm/addon-web-links` | Keep | Terminal UI |
| `react-resizable-panels` | Keep (conditional) | Use tabs on mobile instead of panels |
| `react-dnd` | Keep | Core lib works with touch backend |
| `react-dnd-html5-backend` | Replace | Use `react-dnd-touch-backend` on mobile |
| `electron` (devDep) | Keep (unused) | Only loaded in Electron build |
| `isomorphic-git` | Keep | Needs InMemoryFS adapter (Phase 3) |
| `file-saver` | Keep | Works in WebView |
| `jszip` | Keep | Pure JS, works everywhere |
| `framer-motion` | Keep | Works in WebView |
| `react-hotkeys-hook` | Keep (no-op) | No Ctrl/Cmd on mobile keyboards |
| `chart.js` | Keep | Works in WebView |
