# Dot - Conversational AI Chat Buddy

Dot is a real-time voice AI companion built with React + Vite and Gemini Live API.

The goal of this app is simple: make conversation feel natural, warm, and human, like chatting with a buddy.

## What It Does

- Real-time microphone input and voice responses
- Low-latency back-and-forth conversation loop
- Friendly on-screen animated face synced to audio activity
- Natural conversational system prompt tuned for short spoken turns

## Local Setup

Prerequisites:

- Node.js 18+
- A Gemini API key
- Browser microphone permission

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env.local
```

3. Edit `.env.local` and set:

```bash
GEMINI_API_KEY="your_key_here"
```

4. Start the app:

```bash
npm run dev
```

5. Open the local URL shown by Vite (default: `http://localhost:3000`), click `Start Chatting`, and allow mic access.

## Scripts

- `npm run dev` - run local dev server
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run lint` - TypeScript check

## Notes

- This app currently streams and responds with audio (voice-first buddy mode).
- If connection fails, check your API key and browser microphone permissions first.
