---
type: "query"
date: "2026-09-11T13:05:59.345212+00:00"
question: "every time i try to play a book in horizintal for tablet, it says tts failed check your connection, find the problem and fix"
contributor: "graphify"
outcome: "useful"
source_nodes: ["synthesizeMobileSpeech()", "mobileTtsDriver.js", "useTTS.js"]
---

# Q: every time i try to play a book in horizintal for tablet, it says tts failed check your connection, find the problem and fix

## Answer

Expanded from original query via graph vocab: [tts, speech, native, capacitor, platform, desktopttsdriver, mobilettsdriver, synthesizedesktopspeech, synthesizemobilespeech, connection, error, play]. The mobile TTS driver's configured-server fallback accepted any HTTP 200 payload and reset its Edge failure counter, even when the payload was static HTML with no audio. That prevented the native device-voice fallback and caused the engine to exhaust retries with the connection-error toast. Fixed by validating that fallback responses contain a data:audio payload before treating them as successful; invalid responses now continue through failure accounting to the device voice. Added regression coverage for invalid HTML and valid audio responses.

## Outcome

- Signal: useful

## Source Nodes

- synthesizeMobileSpeech()
- mobileTtsDriver.js
- useTTS.js