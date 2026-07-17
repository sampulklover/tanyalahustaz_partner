# Tanyalah Ustaz Partner AI API

Partner platform for websites that want to offer **Tanyalah Ustaz Islamic AI** to their users.

Built with **Next.js**, **Supabase**, and **OpenRouter**. Partners get API keys and call `/api/v1/chat`. We retrieve relevant knowledge articles, build a grounded prompt, and return AI answers — partners never touch OpenRouter or Supabase directly.

> **Internal:** [System evolution doc](docs/SYSTEM_EVOLUTION.md) — phases, architecture, key concepts.

## Architecture

```
Partner website  →  POST /api/v1/chat  →  Knowledge lookup (Supabase)
                                       →  OpenRouter (AI generation)
                                       →  Reply + sources back to partner

Partner portal   →  Next.js dashboard  →  API keys, chat logs, usage
```

## Features

- **AI chat API** — `POST /api/v1/chat` with knowledge-backed prompts
- **Knowledge base** — curated Islamic articles managed in the admin dashboard, used as AI context
- **Chat history API** — list, fetch, and delete sessions (or clear all history)
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

In Supabase SQL Editor, run all files in order:

- `supabase/migrations/20250702000000_initial_schema.sql`
- `supabase/migrations/20250703000000_ai_knowledge.sql`
- `supabase/migrations/20250706000000_vector_rag.sql`
- `supabase/migrations/20250706000001_embedding_2048_nvidia.sql` (only if you already ran vector_rag with 1536-dim)
- `supabase/migrations/20250707000000_admin_knowledge.sql`
- `supabase/migrations/20250708000000_knowledge_team_roles.sql`

Then add your first **knowledge admin** (Supabase SQL Editor):

```sql
insert into public.knowledge_team_members (user_id, role)
select id, 'admin' from public.profiles where email = 'you@example.com';
```

Knowledge admins can invite colleagues at **Dashboard → Knowledge → Team & roles** with:

| Role | Can do |
|------|--------|
| **Admin** | Assign roles + full article access |
| **Editor** | Create, edit, publish, delete articles |
| **Viewer** | Read drafts (read-only) |

### 4. Generate vector embeddings (required for semantic RAG)

After migrations, embed your knowledge articles:

```bash
npm install
npm run embed-knowledge
```

Re-run this whenever you add or update articles outside the admin UI, or use **Re-embed all published** in `/dashboard/knowledge`.

### Changing the embedding model

If you change `OPENROUTER_EMBEDDING_MODEL` (e.g. NVIDIA 2048-dim ↔ OpenAI small 1536-dim):

1. Update `OPENROUTER_EMBEDDING_MODEL` in `.env`
2. Update `EMBEDDING_DIMENSIONS` in `lib/embeddings.ts` to match the new model
3. If vector size changed: run a Supabase migration on `knowledge_chunks.embedding` (truncate table, alter `vector(N)`)
4. **Re-embed everything** (old vectors are not compatible with a new model):

```bash
npm run embed-knowledge
```

You cannot mix embeddings from different models. See [docs/SYSTEM_EVOLUTION.md](docs/SYSTEM_EVOLUTION.md) for details.

### 5. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SECRET_KEY` | Server-only admin access (`sb_secret_…`; or legacy `SUPABASE_SERVICE_ROLE_KEY`) |
| `OPENROUTER_API_KEY` | Your OpenRouter API key ([openrouter.ai](https://openrouter.ai)) |
| `OPENROUTER_EMBEDDING_MODEL` | Embedding model for RAG (default: `nvidia/llama-nemotron-embed-vl-1b-v2:free`, 2048-dim) |
| `NEXT_PUBLIC_APP_URL` | App URL for auth redirects |

### 6. Configure Supabase Auth redirect

In Supabase → Authentication → URL Configuration:

- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/auth/callback`

### 7. Start the dev server

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

# List chat sessions
curl "http://localhost:3000/api/v1/chat/sessions" \
  -H "Authorization: Bearer tlh_live_YOUR_KEY"

# Partner profile
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer tlh_live_YOUR_KEY"
```

## Project structure

```
app/
  api/v1/
    chat/           # AI chat + session history
    me/             # Partner profile
    usage/          # API usage stats
  dashboard/        # Partner portal
  docs/             # API documentation
lib/
  knowledge.ts      # Vector RAG retrieval + keyword fallback
  embeddings.ts     # OpenRouter embeddings
  chat-history.ts   # Multi-turn session memory
  embed-knowledge.ts
  openrouter.ts     # OpenRouter chat client
supabase/migrations/
  knowledge_articles
  knowledge_chunks    # Chunked vectors for semantic search
  partner_chat_logs
```

## How chat works

1. Partner sends `{ message, category?, session_id? }` to `/api/v1/chat`
2. Server embeds the user message and searches `knowledge_chunks` via **pgvector** (semantic RAG)
3. If no vectors exist yet, falls back to keyword search on `knowledge_articles`
4. Optional `category` narrows retrieval (e.g. `"fiqh"`)
5. Previous messages for the same `session_id` are loaded from `partner_chat_logs` (up to 8 turns)
6. Top chunks + chat history are sent to OpenRouter
7. Response includes `reply`, `sources`, and `session_id`
8. Request is logged in `partner_chat_logs` (visible in dashboard)

## Production setup

### Run new migrations

Apply `supabase/migrations/20250709000000_tighten_knowledge_rls.sql` and `20250709000001_embed_jobs_and_invites.sql` in your Supabase SQL editor (in order).

### Signup invites

Set `SIGNUP_INVITE_CODES` in env for simple codes, or insert DB invites:

```sql
-- Code "beta-partner-2025" — hash with SHA-256 of lowercase trimmed code
insert into public.partner_signup_invites (code_hash, label, max_uses)
values ('<sha256-hex-of-code>', 'Beta cohort', 25);
```

Use `SIGNUP_MODE=open` only for local development.

### Sentry

1. Create a project at [sentry.io](https://sentry.io)
2. Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in Vercel env vars
3. Optionally set `SENTRY_ORG` and `SENTRY_PROJECT` for source map uploads

### Vercel Cron

Set `CRON_SECRET` in Vercel — the cron at `/api/cron/embed-jobs` runs once daily (Hobby plan limit) as a backup sweeper for embedding jobs from bulk imports. Primary processing still runs via `after()` on import. Upgrade to Pro if you need sub-daily cron schedules.

## Security notes

- `OPENROUTER_API_KEY` and `SUPABASE_SECRET_KEY` are server-only
- Partner API keys are SHA-256 hashed
- Knowledge articles are read-only for partners via API
- Rate limiting is enabled per API key (chat: 20/min, 500/day by default) and playground (10/min, 50/day)
- Email verification is required before dashboard access
- Partner signup is invite-only by default (`SIGNUP_MODE=invite`)
- Knowledge articles are only readable by the knowledge team in Supabase; partners use the API
- Sentry captures server/client errors when `SENTRY_DSN` is set

## Next steps

- Usage billing per partner
- Streaming responses for chat widgets
- Deploy to Vercel with production env vars
