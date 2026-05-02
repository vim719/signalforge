# SignalForge

Autonomous execution layer for memecoin signals. Built with Node.js, Express, Redis (ioredis), Telegram bot (telegraf), KeeperHub integration, and 0G.ai agent brain.

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your actual API keys
node -e "const {app} = require('./src/api/server'); app.listen(3001);"
```

## Deploy Configuration (configured by /setup-deploy)

- Platform: Vercel (auto-deploy on push)
- Production URL: https://signalforge.vercel.app (or custom domain)
- Deploy workflow: Auto-deploy on push to main
- Deploy status command: `vercel ls --prod`
- Merge method: squash (clean history)
- Project type: web app / API
- Post-deploy health check: https://signalforge.vercel.app/health

### Custom deploy hooks

- Pre-merge: `npm test` (all 27 Jest tests must pass)
- Deploy trigger: automatic on merge to main
- Deploy status: poll Vercel dashboard or health endpoint
- Health check: `curl https://signalforge.vercel.app/health`

## Testing

```bash
npm test  # Run all 27 tests (queue 10, API 7, telegram 4, keeperhub 6)
```

Goal: 100% test coverage. Every new function gets a test. Every bug gets a regression test.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review

## Environment Variables

See `.env.example` for all required variables:
- `TELEGRAM_BOT_TOKEN` — Telegram bot (@SignalForge7bot)
- `WEBHOOK_API_KEY` — API key for POST /webhook auth
- `KEEPERHUB_API_URL` + `KEEPERHUB_API_KEY` — KeeperHub integration
- `OG_AI_API_KEY` — 0G.ai agent brain
- `REDIS_HOST` + `REDIS_PORT` — Redis instance (cloud or local)

## API Endpoints

- `POST /webhook` — receive signals (requires `x-api-key` header)
- `GET /health` — queue health status
- `GET /queue/length` — current queue depth

## Architecture

```
src/
├── api/server.js      # Express API (helmet, CORS, rate limiting)
├── queue/redis-client.js  # Redis queue operations
├── telegram/bot.js      # Telegram bot commands
└── keeperhub/           # KeeperHub integration
    ├── client.js       # KeeperHub API client
    └── service.js     # Signal execution service
```

## Next Steps

1. Run `/qa` for quality assurance
2. Configure Vercel project and connect GitHub repo
3. Integrate 0G agent for autonomous signal processing
4. Set up monitoring and alerts
