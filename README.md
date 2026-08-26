# my AI

A real OpenAI-powered multimodal AI web app.

## Features
- Text generation with Responses API
- Image generation with GPT Image
- Video generation with Sora video jobs + polling
- Code generation into multiple project files
- Dialogue mode using two different models
- Persistent local history
- File upload endpoint foundation
- No fake generated media or simulated API responses

## Run
1. Install Node.js 20+.
2. Copy `.env.example` to `.env`.
3. Put your OpenAI API key in `OPENAI_API_KEY`.
4. `npm install`
5. `npm start`
6. Open `http://localhost:3000`

Never put an API key in browser JavaScript. The browser talks only to the server.


## UI
The interface uses a blue/yellow crystal-glass visual system inspired by the provided design reference: translucent panels, blur, soft gradients, rounded cards, responsive navigation, creation cards, history, model status, usage and a large prompt workspace.
