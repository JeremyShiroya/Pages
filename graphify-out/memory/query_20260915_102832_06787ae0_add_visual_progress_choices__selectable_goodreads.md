---
type: "query"
date: "2026-09-15T10:28:32.641322+00:00"
question: "Add visual progress choices, selectable Goodreads StoryGraph or personal ratings with persistent background sync, settings system-bar backgrounds, and Minimal actions by default"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PreferencesMobile.vue", "useBookishSettings.js", "useRatingSync.js", "BookProgressDisplay.vue", "BookRatingDisplay.vue"]
---

# Q: Add visual progress choices, selectable Goodreads StoryGraph or personal ratings with persistent background sync, settings system-bar backgrounds, and Minimal actions by default

## Answer

Expanded from original query via graph vocabulary: preferences, progress, rating, goodreads, personal, metadata, toast, notification, settings, background, action, minimal. Implemented visual bar/ring progress, app-wide selected rating rendering and lossless personal scales, cached Goodreads and StoryGraph background synchronization with persistent progress and completion toast, a settings-only system-bar palette plugin, and Minimal as the migrated default. Production build and focused tests pass.

## Outcome

- Signal: useful

## Source Nodes

- PreferencesMobile.vue
- useBookishSettings.js
- useRatingSync.js
- BookProgressDisplay.vue
- BookRatingDisplay.vue