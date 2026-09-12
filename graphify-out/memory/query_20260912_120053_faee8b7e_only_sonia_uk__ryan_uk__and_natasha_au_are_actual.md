---
type: "query"
date: "2026-09-12T12:00:53.821808+00:00"
question: "Only Sonia UK, Ryan UK, and Natasha AU are actual voices; the rest male and female sound the same and robotic"
contributor: "graphify"
outcome: "corrected"
correction: "Repeated robotic voices were caused by the UI/server voice-ID allowlist mismatch; Davis additionally returned empty upstream audio and needed replacement with Andrew."
source_nodes: ["normalizeAvailableVoice()", "synthesizeEdgeSpeech()", "index.post.ts", "SettingsAudioPanel.vue"]
---

# Q: Only Sonia UK, Ryan UK, and Natasha AU are actual voices; the rest male and female sound the same and robotic

## Answer

Expanded from original query via vocab: [voice, voices, edge, edgetts, synthesizeedgespeech, normalizeavailablevoice, displayvoices, native, nativespeech, picknativevoiceindex, settingsaudiopanel, audio]. The UI roster had been changed to Liam, Emma, Ava, and Brian while server/api/tts/index.post.ts still allowed Christopher, Jenny, Aria, and Guy. The new IDs received 400 unknown voice and all fell back to the same local browser voice. Synchronized the server allowlist, replaced upstream-broken Davis with verified Andrew, and added Davis-to-Andrew settings migration. Live synthesis returned non-empty audio with eight unique hashes for all eight visible voices.

## Outcome

- Signal: corrected
- Correction: Repeated robotic voices were caused by the UI/server voice-ID allowlist mismatch; Davis additionally returned empty upstream audio and needed replacement with Andrew.

## Source Nodes

- normalizeAvailableVoice()
- synthesizeEdgeSpeech()
- index.post.ts
- SettingsAudioPanel.vue