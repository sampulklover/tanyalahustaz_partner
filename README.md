# TanyaLah Ustaz Partner AI API

Partner platform for websites that want to offer **TanyaLah Ustaz Islamic AI** to their users.

Built with **Next.js**, **Supabase**, and **OpenRouter**. Partners get API keys and call `/api/v1/chat`. We retrieve relevant knowledge articles, build a grounded prompt, and return AI answers — partners never touch OpenRouter or Supabase directly.

## Architecture

```
Partner website  →  POST /api/v1/chat  →  Knowledge lookup (Supabase)
                                       →  OpenRouter (AI generation)
                                       →  Reply + sources back to partner

Partner portal   →  Next.js dashboard  →  API keys, chat logs, usage
```

## Features

- **AI chat API** — `POST /api/v1/chat` with knowledge-backed prompts
- **Knowledge base** — curated Islamic articles managed by TanyaLah Ustaz, used as AI context
- **Knowledge browse API** — `GET /api/v1/knowledge` for partners to inspect available content
- **Developer portal** — signup, API keys, chat logs, usage stats
- **OpenRouter integration** — server-side only; model configurable via env

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Copy your project URL and anon key.
3. Copy your **service role key** (Settings → API).

### 3. Run database migrations

In Supabase SQL Editor, run both files in order:

- `supabase/migrations/20250702000000_initial_schema.sql`
- `supabase/migrations/20250703000000_ai_knowledge.sql`

The second migration seeds sample knowledge articles for development.

### 4. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin access |
| `OPENROUTER_API_KEY` | Your OpenRouter API key ([openrouter.ai](https://openrouter.ai)) |
| `OPENROUTER_MODEL` | Model slug (default: `google/gemini-2.0-flash-001`) |
| `NEXT_PUBLIC_APP_URL` | App URL for auth redirects |

### 5. Configure Supabase Auth redirect

In Supabase → Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

### 6. Start the dev server

```bash
npm run dev
```

## API usage

Create an API key in the dashboard, then:

```bash
# AI chat (main partner integration)
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer tlh_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"Can a traveler combine Dhuhr and Asr?","category":"fiqh","session_id":"user-123"}'

# Browse knowledge articles
curl "http://localhost:3000/api/v1/knowledge?category=fiqh" \
  -H "Authorization: Bearer tlh_live_YOUR_KEY"

# Partner profile
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer tlh_live_YOUR_KEY"
```

## Project structure

```
app/
  api/v1/
    chat/           # AI chat endpoint (OpenRouter + knowledge)
    knowledge/      # Browse knowledge articles
    me/             # Partner profile
    usage/          # API usage stats
  dashboard/        # Partner portal
  docs/             # API documentation
lib/
  knowledge.ts      # Knowledge retrieval for AI context
  openrouter.ts     # OpenRouter client
  api-auth.ts       # API key validation
supabase/migrations/
  knowledge_articles   # Platform-managed AI knowledge
  partner_chat_logs  # Per-partner chat history
```

## How chat works

1. Partner sends `{ message, category?, session_id? }` to `/api/v1/chat`
2. Server searches `knowledge_articles` for relevant published content
3. Matching articles are injected into the system prompt
4. OpenRouter generates the reply
5. Response includes `reply`, `sources`, `model`, and `session_id`
6. Request is logged in `partner_chat_logs` (visible in dashboard)

## Security notes

- `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only
- Partner API keys are SHA-256 hashed
- Knowledge articles are read-only for partners via API
- Add rate limiting and per-key quotas before production

## Next steps

- Admin UI to manage `knowledge_articles` (CMS)
- Better retrieval (embeddings / vector search instead of keyword match)
- Rate limiting and billing per partner
- Streaming responses for chat widgets
- Deploy to Vercel with production env vars
