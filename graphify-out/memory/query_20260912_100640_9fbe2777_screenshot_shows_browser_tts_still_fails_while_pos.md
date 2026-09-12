---
type: "query"
date: "2026-09-12T10:06:40.159119+00:00"
question: "Screenshot shows browser TTS still fails while POST /api/tts returns 200 OK with content-length 59"
contributor: "graphify"
outcome: "corrected"
correction: "The immediate screenshot failure was caused by an empty base64 audio payload returned as HTTP 200, not browser Web Speech plugin detection alone."
source_nodes: ["hasUsableAudio()", "synthesizeDesktopSpeech()", "synthesizeEdgeSpeech()", "createNativeSpeechAudio()"]
---

# Q: Screenshot shows browser TTS still fails while POST /api/tts returns 200 OK with content-length 59

## Answer

Expanded from original query via vocab: [tts, synthesizedesktopspeech, hasusableaudio, nativespeechsupported, createnativespeechaudio, loadnativevoices, audio, play, error, retry, addtoast, useapiendpoint]. The live endpoint returned exactly 59 bytes: an empty data URL, data:audio/mp3;base64,. hasUsableAudio accepted it because it checked only the prefix, then HTMLAudioElement emitted an error and useTTS showed the connection toast. Fixed the server to reject and retry zero-byte Edge streams and the desktop driver to require a non-empty data payload before using audio; it now falls back to browser speech.

## Outcome

- Signal: corrected
- Correction: The immediate screenshot failure was caused by an empty base64 audio payload returned as HTTP 200, not browser Web Speech plugin detection alone.

## Source Nodes

- hasUsableAudio()
- synthesizeDesktopSpeech()
- synthesizeEdgeSpeech()
- createNativeSpeechAudio()