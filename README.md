# proxy-api

A configurable Cloudflare Worker reverse proxy with multi-route mapping, path rewriting, API key auth, request/response header manipulation, structured logging, and a health check endpoint.

## Features

- **Multi-route routing** — prefix-based dispatch to different upstream origins
- **Path rewriting** — `/v1/users` → `/api/v2/users` via regex replacement
- **Request/response header manipulation** — add, set, or remove headers per route
- **API key auth** — opt-in per route, via configurable header
- **Structured JSON logging** — method, path, target, status, duration, client IP
- **CORS support** — preflight handling + `Access-Control-Allow-Origin: *`
- **Health check** — `GET /health` or `GET /__health`

## How It Works

```
Client → Worker (https://proxy.example.com/api/users?k=v)
         → Upstream (https://sc-api.doki.ren/api/users?k=v)
```

Every request is matched against the `ROUTES` config by path prefix (longest match wins).

## Configuration

All config lives in `wrangler.toml` `[vars]` (or Cloudflare secrets for production).

### `ROUTES` (JSON array)

Each route object:

```jsonc
{
  "prefix": "/api/",                    // path prefix to match (required)
  "origin": "https://sc-api.doki.ren",  // upstream base URL (required)
  "host": "sc-api.doki.ren",            // Host header sent upstream (default: parsed from origin)
  "auth": true,                         // require API key? (default: true)

  "rewrite": [                          // path rewriting: [regex, replacement]
    ["^/api/v1/(.*)", "/api/v2/$1"]
  ],

  "set_request_headers": {              // headers to add/set on upstream request
    "X-Custom": "value"
  },
  "remove_request_headers": ["Cookie"], // headers to strip from upstream request

  "set_response_headers": {             // headers to add/set on client response
    "X-Powered-By": "proxy-api"
  },
  "remove_response_headers": [          // headers to strip from client response
    "X-Internal"
  ]
}
```

### Multi-route example

```jsonc
[
  {
    "prefix": "/api/app/",
    "origin": "https://sc-api.doki.ren",
    "host": "sc-api.doki.ren"
  },
  {
    "prefix": "/api/",
    "origin": "https://other-service.example.com",
    "auth": false
  }
]
```

`/api/app/foo` matches the first route; `/api/bar` falls through to the second.

### `AUTH_KEYS`

Comma-separated API keys. Leave empty to disable auth entirely.

```
AUTH_KEYS = "key1,key2,key3"
```

### `AUTH_HEADER_NAME`

Header name for the API key. Default: `X-API-Key`.

## Health Check

```
GET /health
```

Returns route config and auth state:

```json
{
  "status": "ok",
  "authEnabled": true,
  "routes": [
    { "prefix": "/api/", "origin": "https://sc-api.doki.ren", "authRequired": true }
  ]
}
```

## Development

```bash
npm run dev
```

## Deploy

```bash
npm run deploy
```

For secret values in production:

```bash
wrangler secret put AUTH_KEYS
wrangler secret put ROUTES
```
