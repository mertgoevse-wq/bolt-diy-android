# bolt.diy Android

Android-first mobile port/adaptation of bolt.diy.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

---

## What This Project Is

**bolt.diy Android** is an Android port/adaptation of [bolt.diy](https://github.com/stackblitz-labs/bolt.diy), the browser-based AI coding assistant by StackBlitz Labs. This project wraps the web application in a native Android WebView shell using [Capacitor](https://capacitorjs.com/), and progressively replaces desktop-only features (WebContainer, in-browser terminal, live preview) with Android-compatible adapters.

The chat interface, AI provider selection, code generation, and file editing all work on Android. Features that depend on [WebContainer](https://webcontainer.io/) — in-browser terminal, live preview, and shell commands — are not available in the Android WebView and show a fallback message.

> **Android port/adaptation © 2026 Mert Gövse.**  
> Based on bolt.diy by StackBlitz Labs and the bolt.diy contributors.  
> Original bolt.diy project remains credited to its original authors.

---

## Android Status

| Feature | Status |
|---------|--------|
| Capacitor WebView shell | ✅ Complete |
| Chat / AI code generation | ✅ Works |
| File editing & tree | ✅ Works (mobile drawer) |
| Platform adapter layer | ✅ Complete |
| Touch DnD backend | ✅ Complete |
| Mobile bottom navigation | ✅ Complete |
| In-browser terminal | ⚠️ Fallback (stub) |
| Live preview | ⚠️ CSS fallback only |
| WebContainer | ❌ Not available in WebView |
| APK build (`cap sync`) | ⚠️ Needs static `index.html` pre-render step |

**Current phase:** Shell + adapter layer complete. Fallback UIs for unsupported features are in place.

---

## How to Build

### Prerequisites

- **Node.js** ≥ 18.18
- **npm** or **pnpm**
- **Android Studio** (for opening and building the native project)
- **JDK 17+** (bundled with recent Android Studio)
- **Android SDK** (installed via Android Studio)

### Steps

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Build the web app (Remix + Vite)
npm run build

# 3. Sync web assets into the Android project
npm run android:sync

# 4. Open in Android Studio
npm run android:open

# 5. Build APK from Android Studio, or:
npm run android:build
```

> **Note:** `cap sync` currently fails because Remix doesn't generate a static `index.html`. See [BUILD_REPORT.md](./BUILD_REPORT.md) for details and next steps.

---

## Known Limitations

- **WebContainer not supported** — The Android WebView cannot run WebContainer. Terminal commands, live preview, and `npm install` are stubbed with fallback messages.
- **No static `index.html`** — Remix generates HTML server-side. A pre-render step is needed for Capacitor to bundle the app.
- **Large bundle size** — The web build produces chunks >500 kB (monaco editor, language packs). Code-splitting is recommended for production.
- **No remote runtime yet** — The adapter layer prepares for a future remote-runtime mode but it is not yet implemented.

---

## Attribution

This project is an Android port/adaptation of **bolt.diy** by **StackBlitz Labs** and the bolt.diy contributors.

- **Original project:** [https://github.com/stackblitz-labs/bolt.diy](https://github.com/stackblitz-labs/bolt.diy)
- **Original license:** MIT — retained in full in [LICENSE](./LICENSE)
- **Original trademarks/logos:** The original bolt.diy logos and trademarks remain the property of their respective owners.

See [NOTICE.md](./NOTICE.md) for full attribution and copyright details.

---

## Copyright

```
Android port/adaptation © 2026 Mert Gövse

Based on bolt.diy by StackBlitz Labs and the bolt.diy contributors.
Original bolt.diy project remains credited to its original authors.

Licensed under the MIT License (see LICENSE file).
```
