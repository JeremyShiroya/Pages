---
type: "query"
date: "2026-09-15T10:56:20.844599+00:00"
question: "Fix the progress ring fidelity, restore provider icon plus stars plus plain rating on book cards, and improve the Preferences ratings UI"
contributor: "graphify"
outcome: "useful"
source_nodes: ["BookProgressDisplay.vue", "BookRatingDisplay.vue", "PreferencesMobile.vue", "LibraryBookCard.vue"]
---

# Q: Fix the progress ring fidelity, restore provider icon plus stars plus plain rating on book cards, and improve the Preferences ratings UI

## Answer

Expanded from original query via graph vocab: [progress, display, rating, preferences, goodreads, story, card, star, cards]. The shared BookProgressDisplay now uses a compact SVG track and rounded progress stroke; BookRatingDisplay restores provider icon, orange stars, and plain score without provider words or slash-scale; PreferencesMobile uses full-width provider selection rows.

## Outcome

- Signal: useful

## Source Nodes

- BookProgressDisplay.vue
- BookRatingDisplay.vue
- PreferencesMobile.vue
- LibraryBookCard.vue