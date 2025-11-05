# Astra Voice

Astra Voice is a web-based voice assistant that interprets natural language commands and turns them into simulated phone controls. It is built with Next.js (App Router) and leverages the browser’s Web Speech API to capture speech, translate intents, and update a live device dashboard.

## Features

- Real-time voice capture with interim transcript feedback.
- Manual command input with natural language parsing.
- Simulated device dashboard covering radios, focus modes, and power optimizations.
- Contextual assistant responses and activity feed with success indicators.
- Responsive, glassmorphism-inspired layout ready for desktop and mobile browsers.

## Getting Started

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:3000`.

### Production Build

```bash
npm run build
npm start
```

## Command Coverage

- Toggle radios such as Wi‑Fi, Bluetooth, Flashlight, and Location.
- Adjust brightness and volume levels (absolute values or incremental changes).
- Control focus states like Silent Mode, Do Not Disturb, and Battery Saver.
- High-level actions including airplane mode, phone calls, and message sending.

The command interpreter is rule-based, making it straightforward to expand with new intents.

## Deploying to Vercel

1. Ensure the `VERCEL_TOKEN` environment variable is set.
2. Deploy the production build:
   ```bash
   vercel deploy --prod --yes --token "$VERCEL_TOKEN" --name agentic-557943ce
   ```
3. Verify the deployment at `https://agentic-557943ce.vercel.app`.

## Tech Stack

- [Next.js](https://nextjs.org/) 14 (App Router, TypeScript)
- [React](https://reactjs.org/)
- [Lucide Icons](https://lucide.dev/) for status glyphs
- Web Speech API (Chrome, Edge)

> Browsers without Web Speech support can still use the manual command input.
