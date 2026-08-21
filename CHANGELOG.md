# Changelog

All notable changes to Dot are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Voice chat overhauled to feel like talking to a human:
  - Mic capture moved to an AudioWorklet with 32 ms chunks (was a deprecated
    ScriptProcessor sending ~256 ms chunks), cutting round-trip latency.
  - Echo cancellation, noise suppression, and auto gain enabled on the mic so
    Dot no longer hears itself and hands-free barge-in works.
  - Interrupting Dot now cuts playback instantly via source-level flush instead
    of tearing down and rebuilding the whole AudioContext.
  - Lip sync and speaking state now driven by actually-playing audio; while
    listening, the face reacts to the user's mic level instead of a fake sine.
  - System prompt rewritten for human turn-taking: short spoken turns, natural
    backchannels, one question at a time, no lists or lectures.
- Base64 encoding of mic audio no longer risks a stack overflow on large buffers.

## [0.1.0] - 2026-08-20

### Added

- Baseline app: real-time voice companion built with React 19 + Vite + Gemini Live API.
- Procedural dot-matrix face (canvas) with blinking eyes, volume-synced mouth, and
  status-colored moods (idle / connecting / listening / error).
- Real-time microphone capture (16 kHz PCM) streamed to Gemini Live, 24 kHz audio
  playback with volume analysis for lip sync.
- Warm, conversational "buddy" system prompt tuned for short spoken turns.
- Dark ambient UI with connection status badges, audio visualizer, and info overlay.
