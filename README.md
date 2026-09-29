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
- **Prepaid credit billing** — top up via ToyyibPay; usage is charged from your balance
- **Per-partner prompt** — API owners can append their own instructions on top of the shared prompt
- **Low-credit email alerts** — set a balance threshold and get an email when it is reached
- **Light / dark theme** — switch in the header or dashboard sidebar (follows the OS by default)
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
- `supabase/migrations/20250928000000_knowledge_gcs_sources.sql`
- `supabase/migrations/20250928000001_knowledge_source_selections.sql`
- `supabase/migrations/20250928000002_knowledge_source_size.sql`
- `supabase/migrations/20250928000003_embedding_1536_openai.sql`
- `supabase/migrations/20250928000004_ai_prompt_settings.sql`
- `supabase/migrations/20250929000002_sync_run_progress.sql`
- `supabase/migrations/20250930000000_toyyibpay_usage_billing.sql`
- `supabase/migrations/20250930000001_partner_prompt_and_alerts.sql`

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

Re-run this whenever your content changes, or use **Re-embed all published** on the
Sources page (`/dashboard/knowledge/sources`).

### Changing the embedding model

If you change `OPENROUTER_EMBEDDING_MODEL` (e.g. OpenAI small 1536-dim ↔ NVIDIA 2048-dim):

1. Update `OPENROUTER_EMBEDDING_MODEL` in `.env`
2. Update `EMBEDDING_DIMENSIONS` in `lib/embeddings.ts` to match the new model
3. If vector size changed: run a Supabase migration on `knowledge_chunks.embedding` (truncate table, alter `vector(N)`, **recreate `match_knowledge_chunks` with the new dimension**)
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
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin access |
| `OPENROUTER_API_KEY` | Your OpenRouter API key ([openrouter.ai](https://openrouter.ai)) |
| `OPENROUTER_EMBEDDING_MODEL` | Embedding model for RAG (default: `openai/text-embedding-3-small`, 1536-dim) |
| `NEXT_PUBLIC_APP_URL` | App URL for auth redirects |
| `TOYYIBPAY_SECRET_KEY` | ToyyibPay user secret key (top-ups) |
| `TOYYIBPAY_CATEGORY_CODE` | ToyyibPay category code for API-credit bills |
| `TOYYIBPAY_ENV` | `sandbox` (dev.toyyibpay.com) or `production` (toyyibpay.com) |
| `OPENROUTER_USD_MYR_RATE` | USD→MYR rate used for usage pricing (default `4.7`) |
| `RESEND_API_KEY` | Resend API key for low-credit emails (optional; alerts skipped when unset) |
| `EMAIL_FROM` | Verified sender for alert emails (default `Tanyalah Ustaz <noreply@tanyalahustaz.com>`) |

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

## Managing knowledge

**Google Cloud is the single source of truth.** The app never authors knowledge —
it mirrors the bucket and serves it to the AI.

Dashboard → Knowledge → **Sources** is the one place to manage it:

| Section | Purpose |
|---------|---------|
| **Connection + stats** | Bucket status, sources selected, article and chunk counts |
| **Choose what to sync** | Browse the bucket and tick folders/files |
| **Knowledge library** | Read-only list of every article the AI can use (searchable) |
| **Sync history** | Results of recent runs |

Supporting controls:

- **Sync now** — pull the selected files into Supabase.
- **Process queue** — embed any articles waiting in the queue.
- **Re-embed all published** — rebuild every embedding (needed after a model change).

The **Prompt** tab tunes how answers are written; the **Team** tab manages roles.

There is **no manual article authoring** — to change content, edit the file in
Google Cloud Storage and re-sync. Synced articles are read-only in the app.

## Tuning the AI prompt

Dashboard → Knowledge → **Prompt** lets an admin tune how answers are written.
The value is stored in the `ai_settings` table (single `default` row) and falls
back to the built-in prompt in `lib/ai-prompt.ts` when empty.

How every request is composed:

```
[your instructions]  ← editable
[KNOWLEDGE REFERENCE MATERIAL]  ← retrieved chunks, always appended
[no-material guard]  ← always enforced, cannot be disabled
```

- Leave the editor **empty** to use the built-in default.
- Use `{{knowledge}}` to place the reference material exactly where you want it;
  otherwise it is appended at the end.
- The no-material rule (never answer from general knowledge when nothing was
  retrieved) is applied by the app and cannot be removed by a prompt.

## Partner prompt & low-credit alerts

**Dashboard → AI prompt** lets each API owner add their own instructions. They
are appended to the shared prompt as a `PARTNER-SPECIFIC INSTRUCTIONS` block and
apply to every request made with that account's API keys. Leaving it empty uses
the shared prompt only, and the no-material guard is never removed.

**Dashboard → Billing → Low-credit email alerts** lets a partner pick a balance
(e.g. RM20). When their credit falls to or below it, the app emails them via
Resend — at most once every 24 hours while the balance stays low. A **Send test
email** button confirms delivery. Requires `RESEND_API_KEY`; without it the
setting is saved but no mail is sent.

## Theming

The app ships light and dark themes. The choice (light / dark / system) is saved
in `localStorage` and applied to `<html data-theme="…">` by an inline script
before first paint, so there is no flash. Tailwind's `dark:` variant is bound to
that attribute in `app/globals.css`.

## Tuning search relevance

Retrieval quality is controlled by two env vars:

| Variable | Default | Meaning |
|----------|---------|---------|
| `RAG_SIMILARITY_THRESHOLD` | `0.5` | Minimum similarity (0–1) for a chunk to be used. Higher = fewer, cleaner citations |
| `RAG_MAX_CHUNKS_PER_ARTICLE` | `2` | Max chunks one article may contribute, so big books don't crowd out other sources |

Test without touching the app:

```bash
npm run search-knowledge -- "your question" --category=fiqh --threshold=0.5
```

Greetings and small talk ("hi", "salam", "thanks") skip retrieval entirely, so they never get random citations.

## Knowledge sources (Google Cloud Storage)

Knowledge documents can live in a **Google Cloud Storage bucket** owned by
another system. Google Cloud is the **source of truth**; Supabase keeps a
**read-only mirror** that the chat API reads from. Sync is **one-way**
(Google Cloud → Supabase) so there is a single writer and no conflicts.

Chat requests never call Google Cloud — they only read Supabase.

### Setup

1. Create a **service account** with **read-only** access to the bucket:
   `roles/storage.objectViewer` (the bucket only, nothing else).
2. Create a JSON key and put it in `GCS_SERVICE_ACCOUNT_JSON`
   (raw JSON, or a base64-encoded copy of the file).
3. Set `GCS_BUCKET_NAME` (e.g. `tanyalah-ustaz-ai`).
4. Run the migrations `20250928000000_knowledge_gcs_sources.sql` and
   `20250928000001_knowledge_source_selections.sql`.
5. In Dashboard → Knowledge → **Sources**, browse the bucket and tick the
   folders/files to mirror.

### Choosing what to sync

The bucket can hold tens of thousands of objects, so the sync mirrors **only
what an admin selects** — never the whole bucket.

- **Browse** the bucket in the UI (folders are navigable).
- **Tick a folder** to mirror everything inside it, including files added later.
- **Tick a file** to mirror just that document.
- Selections are stored in `knowledge_source_selections`.
- Removing a selection **deletes** the mirrored articles it produced, so the
  mirror always matches your selection.

### Running a sync

- **Manual:** Dashboard → Knowledge → **Sources** → **Sync now**.
- **Automatic:** the Vercel cron at `/api/cron/gcs-sync` runs daily
  (2:00 AM). It also queues embeddings; `/api/cron/embed-jobs` finishes them.

### What the sync does

| Step | Behavior |
|------|----------|
| Gather | Reads only the selected folders/files (no full-bucket scan) |
| Supported files | `.pdf`, `.docx`, `.txt`, `.md`, `.html`; images/drafts are skipped |
| Fields | Derived from the filename, first paragraph, and folder path (no AI by default) |
| Change detection | Compares the object `generation`; unchanged files are skipped |
| Deletes | Mirrored articles whose source file was removed (or deselected) are deleted |
| Embeddings | Changed articles are re-embedded for semantic search |

Synced articles are **locked** in the admin UI — edit them in the source
system, then re-sync. Articles created manually in the dashboard are never
touched by the sync. Each mirrored file shows its **size** so admins can see
what was pulled.

### Env vars

| Variable | Description |
|----------|-------------|
| `GCS_BUCKET_NAME` | Bucket that holds the source documents |
| `GCS_SERVICE_ACCOUNT_JSON` | Read-only service account key (raw JSON or base64) |
| `GCS_PREFIX` | Optional folder to start browsing from |
| `GCS_AI_STRUCTURING` | `true` to have the model draft title/summary/tags (costs tokens; default off) |
| `GCS_SYNC_MAX_FILES` | Max new/changed files per run (default 10) |
| `GCS_SYNC_MAX_BYTES` | Max file size to read (default 100 MB) |
| `GCS_SYNC_EXCLUDE_PREFIXES` | Folder names to skip (default `cover-image,cover,covers`) |
| `GCS_SYNC_EXTENSIONS` | Limit the sync to certain file types, e.g. `.pdf` (default: all supported) |

## Billing, credits & markup

Partners pay for AI usage from a **credit balance**, topped up via **ToyyibPay**
(FPX and credit card, MYR). There is no Stripe integration.

**How a chat is priced**

```
partner charge = OpenRouter cost (USD) × (1 + markup%) × USD→MYR rate
```

- The OpenRouter cost comes from the `usage` object returned with every
  completion (streaming and non-streaming).
- The **markup is at least 30%** and is adjustable by a knowledge **admin** at
  **Dashboard → Knowledge → Pricing**. The database enforces the 30% floor.
- `OPENROUTER_USD_MYR_RATE` (default `4.7`) converts USD to MYR.
- Each charge is rounded up to the nearest sen and written to `credit_ledger`;
  the balance is the sum of the ledger.

**Top-up flow**

1. Partner picks an amount on **Dashboard → Top up**.
2. The server creates a ToyyibPay bill (`billExternalReferenceNo` = internal
   reference) and redirects the partner to pay.
3. ToyyibPay calls back to `/api/toyyibpay/callback` and returns the payer to
   `/api/toyyibpay/return`. Both re-check the bill with the ToyyibPay API before
   crediting, so the account is credited once even if callbacks repeat.

**Setup**

1. Create a ToyyibPay account and a **Category** (sandbox:
   [dev.toyyibpay.com](https://dev.toyyibpay.com)).
2. Set `TOYYIBPAY_SECRET_KEY` and `TOYYIBPAY_CATEGORY_CODE`.
3. Set `TOYYIBPAY_ENV=production` (or `sandbox`) and `NEXT_PUBLIC_APP_URL` to your
   public URL — ToyyibPay cannot call back to `localhost`.
4. Run the `20250930000000_toyyibpay_usage_billing.sql` migration.

> Charging is recorded but never blocks a request. Enforce a minimum balance
> before spending if you need hard limits.

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

Set `CRON_SECRET` in Vercel — the cron at `/api/cron/embed-jobs` runs once daily (Hobby plan limit) as a backup sweeper for embedding jobs. Primary processing runs in the background after each sync, and admins can flush the queue on demand from Sources.

## Security notes

- `OPENROUTER_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are server-only
- Partner API keys are SHA-256 hashed
- Knowledge articles are read-only for partners via API
- Rate limiting is enabled per API key (chat: 20/min, 500/day by default) and playground (10/min, 50/day)
- Email verification is required before dashboard access
- Partner signup is invite-only by default (`SIGNUP_MODE=invite`)
- Knowledge articles are only readable by the knowledge team in Supabase; partners use the API
- Sentry captures server/client errors when `SENTRY_DSN` is set

## Next steps

- Minimum-balance enforcement before serving requests
- Streaming responses for chat widgets
- Deploy to Vercel with production env vars
