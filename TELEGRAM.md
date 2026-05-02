# SignalForge Telegram Bot

## Bot Username

`@SignalForge7bot`

## Setup

1. Set `TELEGRAM_BOT_TOKEN` in `.env` file
2. Start the bot: `node -e "require('./src/telegram/bot')"`

## Commands

### /signal

Submit a trading signal to the queue.

**Usage**:
```
/signal <token> <BUY|SELL> <price>
```

**Examples**:
```
/signal BONK BUY 0.00001234
/signal WIF SELL 0.001500
```

**Response**: Bot replies with signal details and inline keyboard:
- ✅ Execute Now: Bypass queue, execute immediately
- 📋 Queue Signal: Add to Redis queue
- ❌ Cancel: Dismiss the signal

---

### /alert

Set a price alert for a token.

**Usage**:
```
/alert <token> <price>
```

**Example**:
```
/alert BONK 0.00001500
```

---

### /queue

Check the current queue depth.

**Usage**:
```
/queue
```

**Response**:
```
Current queue depth: 5 signals
```

## Inline Keyboard Actions

When you send a `/signal` command, the bot shows three buttons:

| Button | Action |
|--------|--------|
| ✅ Execute Now | Sends signal directly to KeeperHub (bypasses queue) |
| 📋 Queue Signal | Adds signal to Redis queue for later processing |
| ❌ Cancel | Dismisses the signal without action |

## Signal Flow (Telegram → Execution)

```
User sends /signal BONK BUY 0.00001234
    ↓
Bot validates input
    ↓
User clicks "📋 Queue Signal"
    ↓
bot.action(/queue_...) triggers
    ↓
enqueue({token, action, price, source:'telegram'}) called
    ↓
Redis LPUSH adds to 'signals:queue'
    ↓
(processQueue runs later)
    ↓
dequeue() removes from tail (FIFO)
    ↓
0G Agent analyzes signal
    ↓
executeSignal() → KeeperHub → On-chain trade
```

## Error Handling

| Error | Response |
|-------|----------|
| Missing parameters | `Usage: /signal <token> <BUY\|SELL> <price>` |
| Invalid action | `Invalid action. Use BUY or SELL` |
| Redis error | `Failed to queue signal. Please try again.` |

## Configuration

Set these environment variables in `.env`:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `REDIS_HOST` | Redis cloud host |
| `REDIS_PORT` | Redis port |
| `REDIS_PASSWORD` | Redis password |

## Testing

The bot has 4 tests in `tests/telegram.test.js`:
- Command parsing
- Inline keyboard actions
- Queue integration
- Error handling

Run tests: `npm test`
