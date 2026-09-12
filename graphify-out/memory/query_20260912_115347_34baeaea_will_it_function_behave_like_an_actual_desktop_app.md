---
type: "query"
date: "2026-09-12T11:53:47.654862+00:00"
question: "will it function/behave like an actual desktop app and not just a mock?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["package.json", "nativeSpeech.js", "useDeviceLibrarySync.js", "useDeviceAssets.js", "media-session.client.js", "desktopTtsDriver.test.js"]
---

# Q: will it function/behave like an actual desktop app and not just a mock?

## Answer

Expanded via graph vocabulary: [desktop, native, storage, filesystem, import, offline, install, server, notification, media]. Electron and Tauri produce genuine installed desktop executables with native windows and OS integration, while retaining the Nuxt web UI. Bookish core reading, library, PDF, storage, and desktop views can work, but Capacitor-only filesystem, media notification, sharing, APK update, and native TTS paths need desktop equivalents. Nuxt server/api routes must be bundled locally or hosted remotely for complete behavior.

## Outcome

- Signal: useful

## Source Nodes

- package.json
- nativeSpeech.js
- useDeviceLibrarySync.js
- useDeviceAssets.js
- media-session.client.js
- desktopTtsDriver.test.js