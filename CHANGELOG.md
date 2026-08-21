# Changelog

All notable changes to Dot are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-08-20

### Added

- Baseline app: real-time voice companion built with React 19 + Vite + Gemini Live API.
- Procedural dot-matrix face (canvas) with blinking eyes, volume-synced mouth, and
  status-colored moods (idle / connecting / listening / error).
- Real-time microphone capture (16 kHz PCM) streamed to Gemini Live, 24 kHz audio
  playback with volume analysis for lip sync.
- Warm, conversational "buddy" system prompt tuned for short spoken turns.
- Dark ambient UI with connection status badges, audio visualizer, and info overlay.
