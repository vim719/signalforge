# SignalForge Architecture

## System Overview

SignalForge is an autonomous execution layer for memecoin signals, built with a modular, TDD-driven approach.

## High-Level Architecture

```
Signal Sources → Redis Queue → 0G Agent → KeeperHub → Blockchain
```

## Component Details

### 1. API Layer (src/api/server.js)

**Technology**: Express.js with security middleware

**Endpoints**:
| Endpoint | Method | Auth | Purpose |
|----------|---------|------|---------|
| `/health` | GET | Public | Queue health + Redis status |
| `/queue/length` | GET | Public | Current queue depth |
| `/webhook` | POST | `x-api-key` | Ingest signals from sources |

**Security**:
- `helmet`: Security headers
- `cors`: Configurable origin restrictions  
- `express-rate-limit`: 100 req/15min per IP
- API key validation on `/webhook`

### 2. Queue Layer (src/queue/redis-client.js)

**Technology**: Redis (ioredis) with cloud hosting

**Operations**:
| Function | Purpose | Returns |
|----------|---------|---------|
| `enqueue(signal)` | Add signal to queue | `{success, id, timestamp}` |
| `dequeue()` | Remove signal from queue (FIFO) | `signal \| null` |
| `getQueueLength()` | Get current queue depth | `number` |
| `getQueueHealth()` | Check Redis + queue status | `{status, length, redis}` |

**FIFO Logic**:
- enqueue: LPUSH (add to head)
- dequeue: RPOP (remove from tail) = FIFO order

### 3. Telegram Bot (src/telegram/bot.js)

**Technology**: Telegraf.js

**Commands**:
| Command | Purpose | Example |
|---------|---------|---------|
| `/signal <token> <BUY\|SELL> <price>` | Submit trading signal | `/signal BONK BUY 0.00001234` |
| `/alert <token> <price>` | Set price alert | `/alert BONK 0.00001500` |
| `/queue` | Show queue depth | `/queue` |

### 4. KeeperHub Integration (src/keeperhub/)

**Client (client.js)**: HTTP client with API key auth
- `executeSignal(signal)`: POST /execute-signal
- `getStatus()`: GET /status

**Service (service.js)**: Orchestrate signal execution flow
- Flow: `dequeue() → executeSignal() → {success, txId}`

### 5. 0G.ai Agent (0g.config.js)

**Purpose**: AI brain for signal analysis and autonomous decisions

**Configuration**:
- Compute: Model `0g-lite`, temperature 0.7, maxTokens 2000
- Storage: Signal history bucket `signalforge-storage`
- Agent: Max 3 concurrent, retry limit 3, timeout 30s
- Rules: Min confidence 0.7, max price deviation 0.15, cooldown 5s

## Data Flow Example

### Scenario: User sends `/signal BONK BUY 0.00001234` via Telegram

1. Telegram Bot receives /signal command
2. Bot validates: token=BONK, action=BUY, price=0.00001234
3. User clicks "📋 Queue Signal" inline button
4. bot.action(/queue_...) triggers
5. enqueue({token, action, price, source:'telegram'}) called
6. Redis LPUSH adds signal to head of 'signals:queue'
7. processQueue() runs (via cron or manual trigger)
8. dequeue() removes signal from tail (RPOP) = FIFO
9. 0G Agent analyzes signal (confidence, deviation checks)
10. If confidence >= 0.7: executeSignal(signal) called
11. KeeperHub API receives signal via POST /execute-signal
12. KeeperHub executes on-chain trade
13. Returns {success: true, txId: '0x...'}

## Deployment Architecture

```
GitHub Repo (main branch)
    ↓ Push to main
Vercel Deploy (auto-deploy)
    ↓
Cloud Services:
    - Redis Cloud (ioredis connection)
    - KeeperHub API (execution layer)
    - 0G.ai API (agent brain)
    - Telegram (bot @SignalForge7bot)
```

## Testing Strategy

### TDD Workflow (Strict)

Phase1: Baseline → Write failing test
Phase2: Test Gen → Generate tests for feature
Phase3: Implementation → Write code to pass tests
Phase4: Regression → Verify no regressions

### Test Coverage (27 tests total)

| Module | Tests | Coverage |
|--------|-------|----------|
| Queue (tests/queue.test.js) | 10 | Redis operations, FIFO, health |
| API (tests/api.test.js) | 7 | Endpoints, auth, validation |
| Telegram (tests/telegram.test.js) | 4 | Commands, inline keyboard |
| KeeperHub (tests/keeperhub.test.js) | 6 | Execution, status, errors |

## Security Considerations

1. **API Key Auth**: `/webhook` requires `x-api-key` header
2. **Helmet**: Security headers (XSS, MIME-sniffing, etc.)
3. **CORS**: Configurable allowed origins
4. **Rate Limiting**: 100 requests per 15 minutes per IP
5. **Input Validation**: Required fields, source whitelist
6. **Redis Auth**: Password-protected cloud Redis
7. **Environment Variables**: Stored in `.env` (gitignore)

## Future Enhancements

- [ ] Integrate 0G agent for signal analysis before KeeperHub execution
- [ ] Add 0G storage for signal history
- [ ] Implement `/scrape` skill for token data collection
- [ ] Add `/pair-agent` skill for token pair analysis
- [ ] Set up Supabase for persistent signal storage
- [ ] Add monitoring and alerts (Grafana/Prometheus)
- [ ] Implement signal confidence scoring
- [ ] Add support for more signal sources (Twitter, Discord)
