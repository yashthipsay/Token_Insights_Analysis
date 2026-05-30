# Token Insight & Analytics API

This project provides a robust Express.js backend integrating with the CoinGecko API, HyperLiquid API, and an AI provider for market analysis. It includes a beautiful React frontend to easily test the APIs.

## Features

1. **Token Insight API (`POST /api/token/:id/insight`)**
   - Fetches live cryptocurrency data from CoinGecko.
   - Summarizes the data using a configured AI model (defaulting to a generic prompt via a Groq/OpenAI compatible format).
   
2. **HyperLiquid Wallet Daily PnL API (`GET /api/hyperliquid/:wallet/pnl`)**
   - Fetches historical trades (userFills) and funding events (userFunding).
   - Aggregates daily realized PnL, fees paid, and funding received between specific dates.

## Setup Instructions

### Environment Variables

Copy the `.env.example` file to `.env` and configure your AI model variables.

\`\`\`bash
cp .env.example .env
\`\`\`

If you want to use **Groq**, **OpenRouter**, or a local equivalent via an OpenAI-compatible endpoint:
- Set `AI_API_KEY` to your provider API Key (e.g., from Groq Console or OpenRouter).
- Set `AI_BASE_URL` to your provider's chat API (e.g., `https://api.groq.com/openai/v1` or `https://openrouter.ai/api/v1`).
- Set `AI_MODEL_NAME` to `openai/gpt-oss-120b`.

*(If the key is not set, a mock AI response will gracefully take over so you can still test the integration.)*

### Running Locally (Native)

\`\`\`bash
npm install
npm run dev
\`\`\`
The application will launch on port 3000. Open `http://localhost:3000` to interact with the frontend dashboard.

### Running with Docker

We have provided a `Dockerfile` and a `docker-compose.yml`.

1. Ensure Docker and Docker Compose are installed.
2. Build and start the container:

\`\`\`bash
docker compose up --build
\`\`\`

The server will be available at `http://localhost:3000`.

## API Documentation

### 1. Token Insight
- **Method**: `POST`
- **Endpoint**: `/api/token/:id/insight`
- **Body**: 
  \`\`\`json
  {
    "vs_currency": "usd",
    "history_days": 30
  }
  \`\`\`

### 2. HyperLiquid PnL
- **Method**: `GET`
- **Endpoint**: `/api/hyperliquid/:wallet/pnl?start=YYYY-MM-DD&end=YYYY-MM-DD`
- **Example**: `/api/hyperliquid/0x123...abc/pnl?start=2024-01-01&end=2024-02-01`
