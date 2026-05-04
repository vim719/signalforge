# SignalForge

Autonomous execution layer for memecoin signals. Built for the 38-hour hackathon.

## Overview

SignalForge is a lean relay system that:
1. **Ingests** signals from Telegram, Jupiter, Birdeye, Helius
2. **Queues** them in Redis (FIFO order)
3. **Analyzes** with 0G.ai agent brain
4. **Executes** trades via KeeperHub API

```
Signal Source → Redis Queue → 0G Agent → KeeperHub → Blockchain
```

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your API keys
npm test  # Run all 27 tests
node -e "const {app} = require('./src/api/server'); app.listen(3001);"
```

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | Public | Queue health status |
| `/queue/length` | GET | Public | Current queue depth |
| `/webhook` | POST | `x-api-key` header | Ingest new signal |

### Example: Send a signal

```bash
curl -X POST https://your-vercel-url.vercel.app/webhook \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"token":"BONK","action":"BUY","price":0.00001234,"source":"jupiter"}'
```

## Telegram Bot

Start the bot (set `TELEGRAM_BOT_TOKEN` in `.env`):

```bash
node -e "require('./src/telegram/bot')"
```

### Bot Commands

| Command | Description |
|---------|-------------|
| `/signal <token> <BUY\|SELL> <price>` | Submit a trading signal |
| `/alert <token> <price>` | Set a price alert |
| `/queue` | Check current queue depth |

## Architecture

```
src/
├── api/
│   └── server.js          # Express API (helmet, CORS, rate limiting)
├── queue/
│   └── redis-client.js    # Redis queue (enqueue, dequeue, health)
├── telegram/
│   └── bot.js             # Telegram bot (commands, inline keyboard)
└── keeperhub/
    ├── client.js           # KeeperHub API client (executeSignal, getStatus)
    └── service.js          # Signal execution service (processQueue)
```

### Data Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Signal     │────▶│  Redis      │────▶│  0G Agent  │────▶│  KeeperHub  │
│  Sources    │     │  Queue      │     │  (Analyze) │     │  (Execute)  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
      │                   │                      │                      │
      ▼                   ▼                      ▼                      ▼
  Telegram          FIFO Buffer          Signal Analysis      On-chain Trade
  Jupiter          (cloud Redis)       (0G.ai Lite)       (via KeeperHub)
  Birdeye
  Helius
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (@SignalForge7bot) |
| `WEBHOOK_API_KEY` | API key for POST /webhook authentication |
| `KEEPERHUB_API_URL` | KeeperHub API endpoint |
| `KEEPERHUB_API_KEY` | KeeperHub API key (kh_...) |
| `OG_AI_API_KEY` | 0G.ai agent brain API key (sk-...) |
| `REDIS_HOST` | Redis cloud host  |
| `REDIS_PORT` | Redis port |
| `REDIS_PASSWORD` | Redis password |

## Testing

```bash
npm test  # Runs all 27 tests (queue: 10, API: 7, telegram: 4, keeperhub: 6)
```

### Test Coverage

- **Queue**: FIFO order, Redis connection, health checks, error handling
- **API**: Auth middleware, input validation, rate limiting, CORS
- **Telegram**: Command parsing, inline keyboard actions, signal submission
- **KeeperHub**: Signal execution, status checks, queue processing

## Deployment

**Platform**: Vercel (auto-deploy on push to `main`)

**Production URL**: https://signalforge-[hash]-salzil-2219s-projects.vercel.app

**Deploy steps**:
1. Push to `main` branch
2. Vercel auto-deploys
3. Set environment variables in Vercel dashboard
4. Test `/health` endpoint

### Vercel Environment Variables

Set these in Vercel dashboard (Settings → Environment Variables):
- `REDIS_HOST`
- `REDIS_PORT`
- `REDIS_PASSWORD`
- `WEBHOOK_API_KEY`
- `KEEPERHUB_API_URL`
- `KEEPERHUB_API_KEY`
- `OG_AI_API_KEY`

## 0G.ai Integration

SignalForge uses 0G.ai for:
- **Compute**: Signal analysis (`0g-lite` model)
- **Storage**: Signal history and agent memory
- **Agent**: Autonomous decision-making

Configuration in `0g.config.js`:
```javascript
compute: { model: '0g-lite', temperature: 0.7, maxTokens: 2000 }
storage: { bucket: 'signalforge-storage' }
agent: { name: 'SignalForgeAgent', maxConcurrent: 3 }
```

## KeeperHub Integration

KeeperHub is the execution layer:
- Takes validated signals from Redis queue
- Executes trades on-chain via API
- Returns transaction IDs for tracking

Flow: `dequeue() → executeSignal() → {success, txId}`

## Security

- **Helmet**: Security headers
- **CORS**: Configurable origin restrictions
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **API Key Auth**: Required for POST `/webhook` (header `x-api-key`)
- **Input Validation**: Required fields check, source validation

## Project Structure

```
signalforge/
├── src/
│   ├── api/
│   │   └── server.js          # Express API
│   ├── queue/
│   │   └── redis-client.js    # Redis queue operations
│   ├── telegram/
│   │   └── bot.js             # Telegram bot
│   └── keeperhub/
│       ├── client.js           # KeeperHub API client
│       └── service.js          # Signal execution service
├── tests/
│   ├── queue.test.js           # 10 tests
│   ├── api.test.js             # 7 tests
│   ├── telegram.test.js        # 4 tests
│   └── keeperhub.test.js       # 6 tests
├── api/
│   └── index.js                # Vercel serverless entry point
├── .env.example                # Template for environment variables
├── 0g.config.js               # 0G.ai agent configuration
├── vercel.json                 # Vercel deployment config
├── CLAUDE.md                   # AI agent instructions
└── README.md                   # This file
```

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Run tests (`npm test`)
4. Commit changes (`git commit -m 'Add your feature'`)
5. Push to branch (`git push origin feature/your-feature`)
6. Create a Pull Request

## License

MIT

## MVP Context

Built within **38-hour** using:
- **Approach A++**: Lean Relay + KeeperHub + 0G agent
- **TDD Workflow**: Phase1 Baseline → Phase2 Test Gen → Phase3 Implementation → Phase4 Regression
- **Zero-regression principle**: Every bug gets a test, every feature gets coverage
- **Auto-pilot mode**: Continuous building with AI assistance

---

**SignalForge** — Autonomous memecoin signal execution.
