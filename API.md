# SignalForge API Documentation

## Base URL

Production: `https://signalforge-[hash]-salzil-2219s-projects.vercel.app`

## Authentication

All endpoints except `/health` require authentication via API key.

**Webhook Endpoint**: Include API key in `x-api-key` header or `api_key` query parameter.

```
x-api-key: your-api-key-here
```

## Endpoints

### GET /health

Returns the health status of the Redis queue and API.

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy",
  "length": 5,
  "redis": "connected"
}
```

**Errors**:
- `500`: Redis connection failed

---

### GET /queue/length

Returns the current number of signals in the queue.

**Authentication**: Not required

**Response**:
```json
{
  "length": 5
}
```

**Errors**:
- `500`: Redis connection failed

---

### POST /webhook

Ingest a new trading signal into the queue.

**Authentication**: Required (`x-api-key` header)

**Request Body**:
```json
{
  "token": "BONK",
  "action": "BUY",
  "price": 0.00001234,
  "source": "jupiter"
}
```

**Required Fields**:
- `token` (string): Token symbol (e.g., "BONK", "WIF")
- `action` (string): "BUY" or "SELL"
- `price` (number): Token price in USD

**Optional Fields**:
- `source` (string): Signal source ("jupiter", "birdeye", "helius", "telegram")

**Response**:
```json
{
  "success": true,
  "id": "1714500000000",
  "timestamp": "2026-05-02T12:00:00.000Z"
}
```

**Errors**:
- `400`: Missing required fields or invalid source
- `401`: Invalid or missing API key
- `500`: Failed to enqueue signal

## Rate Limiting

All endpoints are rate-limited to **100 requests per 15 minutes** per IP address.

Exceeding the limit returns:
- `429`: Too many requests

## CORS

CORS is configured via `ALLOWED_ORIGINS` environment variable.
If not set, all origins are allowed (development mode).

## Examples

### Send a signal via curl

```bash
curl -X POST https://your-vercel-url.vercel.app/webhook \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "BONK",
    "action": "BUY",
    "price": 0.00001234,
    "source": "jupiter"
  }'
```

### Check queue health

```bash
curl https://your-vercel-url.vercel.app/health
```

### Get queue length

```bash
curl https://your-vercel-url.vercel.app/queue/length
```
