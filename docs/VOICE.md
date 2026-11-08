# Voice debate

Speak a turn, hear the opponent answer. This document records what is built,
which models run, what licence each one carries, and the latency actually
measured on the laptop this was developed on.

Short version: **the opener arrives at 0.81 s p50, but the opponent's first real
sentence arrives at 4.56 s p50.** That is above the ~2 s target in the brief.
The section [Measured latency](#measured-latency) says so plainly and lists what
would have to change.

## What it is

A voice turn is **not** a second pipeline. A spoken turn is transcribed, checked
by a recognition gate, and then handed to the same `classify_turn` guard, the
same planner, the same draft, and the same `inspect_reply` verifier that a typed
turn uses. Rate limits, auth and the model slot are the same ones. Only the
transport (a WebSocket instead of SSE) and the output (speech instead of text)
differ.

```
mic -> Silero VAD in the page -> 16 kHz mono WAV -> /ws/voice
    -> faster-whisper (CPU int8) -> recognition gate -> guard -> planner -> draft -> verifier
    -> Kokoro-82M sentence by sentence (CPU) -> caption + WAV frames -> WebAudio playback
```

## Models and licences

Everything is free and local. No hosted speech service, no API key, and no
browser `SpeechRecognition`: Chrome's recogniser uploads audio to a cloud
service, so it is not used for input anywhere in this project.

| Component | What it does | Licence | Source |
| --- | --- | --- | --- |
| Kokoro-82M (`kokoro-v1.0.onnx`) | speech synthesis | Apache-2.0 | hexgrad/Kokoro-82M weights, `thewh1teagle/kokoro-onnx` release |
| `kokoro-onnx` | ONNX runtime wrapper | MIT (repository; the installed wheel declares no licence field) | PyPI / GitHub |
| `onnxruntime` | inference | MIT | PyPI |
| faster-whisper | speech recognition | MIT | PyPI |
| CTranslate2 | Whisper backend | MIT | PyPI |
| `Systran/faster-whisper-base.en` | the voice-path checkpoint | MIT (Whisper weights) | Hugging Face |
| Silero VAD v5 (via `@ricky0123/vad-web`) | turn detection in the page | MIT (model), ISC (JS package) | npm |
| `onnxruntime-web` | VAD inference in the page | MIT | npm |
| `soundfile` | WAV encoding | BSD-3-Clause | PyPI |
| qwen3.5:4b | the debate opponent | Apache-2.0 (reported by `ollama show`) | Ollama |
| **espeak-ng** | phonemiser used by Kokoro | **GPL-3.0** | system package |

**Licence surprise, flagged:** Kokoro's phonemiser path needs **espeak-ng**, which
is **GPL-3.0**. On this machine it is an existing system package
(`/usr/bin/espeak-ng`, data in `/usr/share/espeak-ng-data`) and is loaded as a
shared library by `kokoro-onnx`. It is not vendored into this repository, but any
redistribution of a bundled voice service must treat espeak-ng as GPL-3.0 and
either comply or replace it (for example with a permissively licensed
phonemiser). This is the one licence in the stack that is not permissive.

The **Piper** fallback named in the brief is not installed and not used. Piper's
engine is GPL-3.0 as well, and each voice carries its own licence, so it would
need the same review before being added.

### Voice choices (P3)

Each persona is a weighted blend of two Kokoro voices at its own speed. Blends
are built as `Float32Array`s because `kokoro-onnx` does not accept a
comma-separated name string in `create()`.

| Persona | Voices | Blend | Speed | Character |
| --- | --- | --- | --- | --- |
| Strategist | `am_michael`, `am_onyx` | 0.70 / 0.30 | 0.94 | lower, even, deliberate |
| Skeptic | `af_heart`, `af_nicole` | 0.65 / 0.35 | 1.08 | brighter and quicker |
| Diplomat | `bf_emma`, `bf_isabella` | 0.70 / 0.30 | 0.90 | unhurried and warm |
| Moderator | `am_puck` | 1.00 | 1.00 | neutral announcer |

**Not done: the blind listen gate.** The brief's P3 gate is "you can tell the
three opponents apart with your eyes closed". An agent cannot listen, so this
gate is **unverified**. What is verified is that the three personas differ in
base speaker (two male, one female, one British female), in speed, and in the
voice chosen for every synthesis call (a test asserts the persona reaches the
engine). Whether they are *audibly distinct enough* is for a human to judge.

## Setup

```bash
# 1. Backend dependencies (adds Kokoro, onnxruntime, soundfile)
cd ai-backend
uv sync --group tts

# 2. Kokoro weights (~338 MB, not committed)
mkdir -p models/kokoro && cd models/kokoro
curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -L -O https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
cd ../..

# 3. espeak-ng data is required by Kokoro (system package; see the licence note)
#    Debian/Ubuntu: sudo apt install espeak-ng-data
#    Override the paths with ESPEAK_DATA_PATH and ESPEAK_LIBRARY if yours differ.

# 4. STT: the voice path defaults to base.en, downloaded on first use
#    (VOICE_STT_MODEL overrides it)

# 5. Ollama with the debate model
ollama serve
ollama pull qwen3.5:4b

# 6. Frontend: copy the VAD model/worklet and onnxruntime WASM into public/
cd web
npm install
npm run dev        # predev runs scripts/sync-vad-assets.mjs
```

The API needs the voice routes reachable from the dev server. `vite.config.ts`
already proxies `/ws` to `ws://127.0.0.1:8000`, so start the API with
`uvicorn app.main:app --port 8000`.

Two things the socket checks before it will talk:

- **Origin.** The browser sends the page's origin and the API compares it with
  `WEB_ORIGIN`. The default accepts both loopback spellings
  (`http://127.0.0.1:5173,http://localhost:5173`). **A local `.env` overrides that
  default.** If yours pins a single spelling, opening the app under the other
  name (`localhost` vs `127.0.0.1`) closes the socket with 4403. If you serve
  the app from another port or host — or from a device on the LAN — add that
  exact origin.
- **Auth.** The socket authenticates with the session token in the query string,
  because a WebSocket cannot send an `Authorization` header. With
  `REQUIRE_AUTH=true` (the default in a local `.env`) a request without a valid
  token gets close code 4401, and the room reports the sign-in requirement.

`VITE_API_BASE_URL` may stay blank: the client then resolves `/ws/voice`
against the page, which is what makes the Vite proxy work. Set it only when the
API lives on another origin.

### Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `VOICE_TTS` | `auto` | `off` disables server speech entirely (browser `speechSynthesis` is used) |
| `KOKORO_MODEL`, `KOKORO_VOICES` | `models/kokoro/...` | weight paths |
| `ESPEAK_DATA_PATH`, `ESPEAK_LIBRARY` | system paths | espeak-ng used by Kokoro |
| `VOICE_STT_MODEL` | `base.en` | voice-path checkpoint |
| `VOICE_STT_DEVICE` | `cpu` | left on CPU on purpose |
| `VOICE_STT_BEAM_SIZE` | `1` | short turns do not need a wide beam |
| `VOICE_MAX_SEC` | `120` | longest accepted utterance |
| `VOICE_EDIT_WINDOW_MS` | `1500` | how long the recognised turn can be corrected |
| `VOICE_TURN_END_MS` | `1100` | VAD silence before a turn ends (client) |
| `MODEL_WARMUP` | `on` | `off` skips the startup model load (tests, tiny machines) |
| `WEB_ORIGIN` | `http://127.0.0.1:5173,http://localhost:5173` | comma-separated origins allowed to open the socket |

## Measured latency

20 spoken turns through the real `/ws/voice` socket, with the real
faster-whisper `base.en`, the real guard/planner/drafter/verifier,
`qwen3.5:4b` on Ollama, and Kokoro-82M on the CPU. The learner audio was
synthesised with Kokoro using a **different** voice (`af_bella`) and sent as a
24 kHz WAV, so the recognition path is real audio, not a text injection. One
warm-up turn is excluded. Raw per-turn data:
[`docs/voice-measurements.json`](./voice-measurements.json).

Machine: RTX 4050 Laptop (6 GB), 4B model resident on the GPU, TTS and STT on
the CPU.

| Stage | p50 | p95 |
| --- | --- | --- |
| Endpoint wait (speech end → server holds the clip) | **12 ms** | 14 ms |
| Speech recognition (`base.en`, CPU int8) | **798 ms** | 1362 ms |
| Planner (runs only when it has something to plan) | 0 ms | 1791 ms |
| Draft (`qwen3.5:4b`) | **1482 ms** | 1613 ms |
| Verify (deterministic checks; includes a repair when one is needed) | 0 ms | 953 ms |
| **First audio, opener clip** (voice-to-voice) | **814 ms** | 1382 ms |
| **First audio of the actual reply** | **4562 ms** | 6369 ms |
| TTS per sentence (CPU) | ~836 ms for ~2.5 s of audio | — |
| Whole turn until the last caption is sent | 6400 ms | 8917 ms |

### What that means, without spin

- **Voice-to-voice to the opponent's first real sentence is 4.6 s p50.** The
  brief's target was ≤ ~2 s. This does not meet it, and the opener does not fix
  that: it only makes the wait feel shorter, because something in the persona's
  voice answers within 0.81 s.
- The reply cannot be spoken before it is verified, because the voice path uses
  the same guard and verifier as typed turns. That is the design constraint, not
  a bug: drafting and verification are ~1.5-2.5 s of the 4.5 s.
- Speech recognition is the second-largest cost (0.8 s typical, 1.36 s at p95)
  on a 5-8 s utterance with `base.en` on the CPU.
- The first synthesis adds ~0.8 s before the first reply sentence can play,
  because Kokoro renders the first sentence before any of it is sent.

What was tried / what remains:

1. `base.en` on the CPU is already the speed-first choice. `small.en` would
   improve accuracy and cost more time; `tiny.en` would save ~0.3-0.4 s at a
   clear accuracy cost. Neither was adopted without a listening judgement.
2. Moving the STT model load out of the event loop removed a 20 s stall on the
   first turn (it had been dropping the socket's keepalive). Turns are now
   stable from the first utterance.
3. The next real gain is **streaming the draft**: send the first sentence for
   synthesis as soon as it exists, run the cheap verifier checks (leak,
   off-motion) on that sentence, and keep the full check for the remainder. The
   brief allows this only after measurement; it is not implemented, and the
   numbers above are what the current all-before-speaking design costs.
4. A GPU TTS attempt was **not** made: the GPU was already at 5.1 GB of 6.1 GB
   with the 4B model resident, so the 6 GB budget has no room for a second
   resident. TTS on the CPU adds **0 MiB** of VRAM (measured below).

### VRAM

| Configuration | `nvidia-smi` memory used |
| --- | --- |
| Desktop idle, no models | 1130 MiB / 6141 MiB |
| `qwen3.5:4b` resident (warm-up complete) | 5154 MiB / 6141 MiB |
| Above + Kokoro synthesising 5 sentences on the CPU | 5080 MiB / 6141 MiB (no change) |
| Above + faster-whisper `base.en` int8 on the CPU | no measurable change |

The fluctuation between 5154 and 5080 MiB is allocator noise, not the speech
models: both speech models run on the CPU and register no CUDA memory. Keeping
TTS off the GPU is what leaves room for the 4B model to stay resident.

## Behaviour

### Turn end (P2)

Silence timeout defaults to **1100 ms** (`VOICE_TURN_END_MS`), because debaters
pause to think. The VAD runs in the page (Silero v5, WASM) and is handed to
`MicVAD` with `redemptionMs` set from the server's `ready` event. Clips shorter
than 400 ms are dropped on both sides: the client never sends them, and the
server gate drops them anyway because a client is not trusted.

### Recognition gate

Before the guard, an utterance is dropped when:

- it is shorter than 400 ms, or has fewer than 2 words;
- `no_speech_prob` is above 0.6;
- `avg_logprob` is below -1.0;
- it matches a known silence hallucination ("thanks for watching", a lone
  "you", "please subscribe", …).

The hallucination list lives in `tests/fixtures/silence_hallucinations.txt`, and
a test fails if the code and the fixture drift apart. A dropped turn answers
"I didn't catch that. Say it again."; it never reaches the model.

Transcripts are normalised before the guard: stutters and immediate repeats are
collapsed, a missing end mark is added (the guard's soft patterns are anchored
to sentence boundaries), and nothing else is rewritten. Fillers are stripped
only for *matching*; the learner's transcript keeps them.

### Edit window (P2, hands-free only)

In hands-free mode the recognised transcript is sent back as `pending` and shown
for **1.5 s** with an editable field. The learner can send the corrected text or
discard it. Only on `confirm` does the turn reach the guard. Push-to-talk sends
immediately, because the learner chose to send it.

The same **Your words** input is always visible under the exchange. While the
microphone is open it reads "Listening…"; the recognised turn fills it as soon
as local transcription returns, and it stays readable until the next turn. Local
faster-whisper accepts a finished clip rather than a live audio stream, so the
field cannot show words before the utterance ends — no partial or cloud
recogniser is added to fake that. The field is read-only except during the
hands-free edit window, so it never implies a correction changed a turn that was
already sent.

### Streamed reply lines

The opponent's exchange line grows one sentence at a time. It is driven by
playback, not synthesis: each sentence is appended when its audio actually
starts (or when the browser's own voice starts it, when Kokoro is unavailable),
so the text keeps pace with what is being heard. The final `transcript` event
replaces the streamed line with the canonical reply — or, after an interrupt,
with only the sentences that played. The **Streaming / Full reply** control in
the room turns this off for the session; **Settings → Stream replies as they are
written** is the permanent choice. Skip mode still consumes the whole stream, so
the reply and its diagnostics are committed together when `[DONE]` / the final
transcript arrives; it never changes what the model produced.

### Barge-in (P2)

The learner can interrupt while the opponent speaks. Interrupting stops every
scheduled WebAudio source immediately (before the server is told), sends
`interrupt` with the number of captions that actually played, and the server
cancels the rest of the draft and speech. **Only the words that were spoken are
stored**, followed by `[interrupted]`; the count comes from the client's
playback report rather than from what the server merely sent.

To stop the microphone from hearing the speakers, hands-free capture pauses
while the opponent speaks unless the **headphones** toggle is on. That is also
the only mode in which barge-in is live. The brief's P2 gate ("no self-interrupt
on laptop speakers with the toggle off") is implemented this way by construction;
it was **not verified by ear on this laptop**, because an agent cannot listen.

### Delivery cue (P3)

Every learner utterance is measured with the existing `analyze_delivery`
(word-level segments give pace, fillers and pauses). The three numbers are shown
as chips immediately. On every third learner turn, one observable detail is
passed to the planner as private context with the instruction to mention it at
most once, in one clause, never mocking. Observable pattern, not a diagnosis —
and the counter is enforced server-side, not by the prompt alone.

### Moderator and bell (P3)

The moderator is a fourth Kokoro voice. It announces "Round one. Opening
statements." when the client asks (an explicit event, so it can never race the
first turn). The time bell is generated with WebAudio oscillators, so there is no
audio asset and no licence to track.

## Tests

The current backend suite has 395 passing tests. Voice-path coverage includes:

- `tests/test_voice_recognition.py` — every fixture hallucination, word counts,
  confidence gates, stutter collapsing, filler stripping for matching only.
- `tests/test_voice_pipeline.py` — event ordering, sentence-by-sentence
  synthesis, cancel mid-reply, "only spoken words stored", opener rotation, no
  TTS engine, guard redirects being spoken, per-persona voices.
- `tests/test_voice_ws.py` — auth rejection (4401), foreign-origin rejection
  (4403), the recognition gate never calling the model, transcript/chip ordering,
  typed fallback, per-turn rate limits, interrupt payload, malformed frames,
  a second utterance refused rather than queued.
- `tests/test_guard.py` — added run-on spoken turns (no punctuation, fillers):
  four reach the opponent, three unpunctuated requests still redirect. No new
  false positives.

`ruff check app tests` passes with no findings.

The Playwright suite includes a full spoken turn using Chromium's fake audio
device against the mocked API. This checks microphone capture, the voice socket
turn, and both transcript lines in the room. It does not measure real-device
barge-in latency; that still needs a human/device measurement.

## When the room will not open

The room reports the socket's close code, so the failure is never a mystery:

| What you see | What it means |
| --- | --- |
| "Voice needs a signed-in account" (4401) | the socket had no valid session token; sign in. `REQUIRE_AUTH=false` only changes API authentication for isolated local development and does not unlock the browser practice routes. |
| "The API refused this page's origin" (4403) | add the page's exact origin to `WEB_ORIGIN` and restart the API |
| "Account token verification is temporarily unavailable" (4503) | the API could not reach its configured Supabase key service; restore that connection and reconnect |
| "The voice service failed while opening the room" (1011) | inspect the API log for the startup or turn error, then reconnect |
| "Too many voice turns in a row" (4429) | the per-subject rate limit; wait for the retry window |
| "The voice room could not start on this device" | the room component threw while mounting; the arena stays usable. The browser console has the error |
| Room opens, `Speech: none` | `VOICE_TTS=off` or Kokoro failed to load; the browser reads replies instead |
| "Hands-free listening needs the local VAD model" | `web/public/vad/` is missing; re-run `npm run dev` (it copies the assets) |

A blank page is a bug, not a setting: the arena wraps the voice room in an
error boundary, so a failing room shows a message and leaves the typed debate
intact.

## Known limits

- **No full duplex.** The learner cannot talk over the opponent; barge-in cuts
  the reply rather than mixing two audio streams.
- **No voice cloning** and no WebRTC media server. Audio is a WAV over the same
  WebSocket that carries the events.
- **Audio is discarded.** It is transcribed in memory, never written to disk,
  and never stored in the session. There is no voice-retention setting.
- **Sentence granularity for synthesis.** A very long sentence is split at a
  comma, so captions can lag the audio by a clause.
- **The opener is one clip per turn.** If synthesis of the first sentence takes
  longer than the opener, there is a silent gap after it. Nothing loops the
  opener on purpose.
- **Voice needs a signed-in session** in the browser app. The backend also requires a valid Supabase token by default; setting `REQUIRE_AUTH=false` for local API development does not remove the browser sign-in gate.
- **Safari/Firefox are untested.** Chromium is the target; the AudioContext and
  ScriptProcessor paths are standard but not exercised elsewhere.
- **Round format (P4) is not implemented.** The clock pauses while the opponent
  works, but Opening → cross-examination → rebuttal → closing phases, and their
  moderator announcements, are not built.
- The moderator and persona voices are synthesised on demand; only the openers
  are pre-rendered at startup (10 clips, by the module-level cache).
