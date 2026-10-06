# Tanyalah Ustaz Partner — How the Whole System Works

One-page maps of the platform: who talks to what, how a chat request flows,
how knowledge gets in, and how money moves.

---

## 1. Big picture (actors + services)

```
                         ┌──────────────────────────────────────────────┐
                         │                END USERS                      │
                         │  (people on a partner's website/app)          │
                         └───────────────┬──────────────────────────────┘
                                         │ ask a question
                                         ▼
     ┌────────────────────┐      ┌───────────────────────────┐
     │  PARTNER WEBSITE   │      │  PARTNER PORTAL (browser) │
     │  server/backend    │      │  dashboard / playground   │
     └─────────┬──────────┘      └─────────────┬─────────────┘
               │                                │ Supabase Auth session
               │ POST /api/v1/chat              │ (cookies)
               │ Authorization: Bearer tlh_live_│
               ▼                                ▼
     ┌───────────────────────────────────────────────────────────────┐
     │                     NEXT.JS APP (this repo)                    │
     │                          deployed on Vercel                     │
     │                                                                │
     │  ┌──────────────┐  ┌───────────────┐  ┌────────────────────┐   │
     │  │ middleware.ts│  │  API routes   │  │ Server Actions     │   │
     │  │ auth + gate  │  │  /api/...     │  │ app/actions/*      │   │
     │  └──────────────┘  └───────────────┘  └────────────────────┘   │
     │                                                                │
     │  lib/ — the actual business logic (chat, RAG, billing, sync)   │
     └───┬───────────────┬───────────────┬──────────────┬────────────┘
         │               │               │              │
         ▼               ▼               ▼              ▼
 ┌──────────────┐ ┌──────────────┐ ┌───────────┐ ┌──────────────┐
 │  Supabase    │ │  OpenRouter  │ │   GCS     │ │  ToyyibPay   │
 │  (Postgres   │ │  chat +      │ │  bucket   │ │  payments    │
 │  + Auth +    │ │  embeddings  │ │ (knowledge│ │  (top-ups)   │
 │  pgvector)   │ │              │ │  source)  │ │              │
 └──────────────┘ └──────────────┘ └───────────┘ └──────────────┘
                    Resend → low-credit email alerts
                    Sentry → error reporting
```

Key rule: **partners never touch Supabase or OpenRouter directly.** They only
hold a `tlh_live_...` API key. Everything else happens server-side.

---

## 2. Chat request flow (the main product)

Two doors into the same pipeline: the public API (`/api/v1/chat`) and the
dashboard Playground.

```
API caller (Bearer tlh_live_…)
        │
        ▼
┌─────────────────────────── app/api/v1/chat/route.ts ─────────────────────────┐
│  POST { message, session_id?, category?, stream? }                            │
└───────────────┬───────────────────────────────────────────────────────────────┘
                ▼
        lib/api/handler.ts  →  withApiAuth()
        ┌───────────────────────────────────────────────┐
        │ 1. lib/api-auth.ts     hash key → look up api_keys row │
        │ 2. lib/rate-limit.ts   chat: 20/min, 500/day            │
        │ 3. run handler                                          │
        │ 4. lib/api-auth.ts     record api_usage + last_used_at  │
        └───────────────────────┬─────────────────────────────────┘
                                ▼
                    lib/chat.ts  executeChat() / streamChat()
                                │
        ┌───────────────────────┴───────────────────────────────┐
        │ 1. validateChatMessage (non-empty, ≤ 4000 chars)      │
        │                                                       │
        │ 2. findRelevantKnowledge()  ── lib/knowledge.ts ──┐   │
        │       │ small talk? → skip retrieval               │   │
        │       │ any embedded chunks?                       │   │
        │       │   yes → embedQuery() → RPC                 │   │
        │       │          match_knowledge_chunks_hybrid     │   │
        │       │          (vector + full-text, fused)       │   │
        │       │          → selectDiverseChunks             │   │
        │       │   no  → keyword fallback on articles       │   │
        │       └────────────────────────────────────────────┘   │
        │                                                       │
        │ 3. loadChatHistory() ── lib/chat-history.ts ──────────┤
        │       last 8 turns for session_id (partner_chat_logs) │
        │                                                       │
        │ 4. First turn?  → lib/answer-cache.ts getCachedAnswer │
        │       hit → return immediately (no model call)        │
        │                                                       │
        │ 5. generateChatReply() / streamChatReply()            │
        │       ── lib/openrouter.ts ──                         │
        │         composeSystemPrompt()                         │
        │           ├ shared prompt (lib/ai-prompt.ts or        │
        │           │   ai_settings override)                   │
        │           ├ prompt modules (lib/prompts/router.ts)    │
        │           ├ PARTNER-SPECIFIC INSTRUCTIONS             │
        │           ├ KNOWLEDGE REFERENCE MATERIAL (chunks)     │
        │           └ no-material guard (always enforced)       │
        │         model = small talk ? FAST : MAIN              │
        │         call https://openrouter.ai/api/v1/chat/...    │
        │                                                       │
        │ 6. persistChatExchange() ── writes partner_chat_logs  │
        │       computes charge = costUSD × (1+markup) × rate   │
        │       recordUsageCharge() → credit_ledger             │
        │       maybeSendLowBalanceAlert() → Resend email       │
        │                                                       │
        │ 7. storeCachedAnswer() (first turn only)              │
        └───────────────────────┬───────────────────────────────┘
                                ▼
        { reply, session_id, sources[] }   ← JSON
        or SSE events (stream: true): meta → text… → done
```

Playground (`/api/playground/chat`) uses this same pipeline but authenticates
with the portal session instead of an API key.

---

## 3. Knowledge pipeline (how the AI learns)

Google Cloud Storage is the **single source of truth**. Supabase holds a
read-only mirror that chat reads. Sync is one-way: GCS → Supabase.

```
  Editors / other systems                Google Cloud Storage bucket
        │                                        │
        │ upload / edit docs                     │ (.pdf .docx .txt .md .html)
        ▼                                        │
   ┌──────────────────────────┐                  │
   │  Admins pick what to sync │                  │
   │  dashboard → Knowledge →  │                  │
   │  Sources (tick folder/    │                  │
   │  file) → knowledge_source_│                  │
   │  selections table         │                  │
   └────────────┬──────────────┘                  │
                │                                 │
   Manual "Sync now"  ─┐                          │
   Vercel cron 2:00 AM ┴─► /api/cron/gcs-sync ────┘
                (also /api/knowledge/sources/sync)
                             │
                             ▼
                   lib/gcs-sync.ts
        ┌────────────────────────────────────────────┐
        │ list selected objects only (never full scan)│
        │ extract text (extractDocumentText / OCR)     │
        │ derive fields from filename + paragraph     │
        │   + folder path (no AI unless enabled)      │
        │ compare object "generation" → skip unchanged │
        │ upsert knowledge_articles                    │
        │ delete articles whose source is gone         │
        │ queue embed job for changed articles         │
        └───────────────┬─────────────────────────────┘
                        ▼
                 knowledge_embed_jobs  (queue)
                        │
      processed by lib/knowledge-embed-jobs.ts
      (inline after sync + /api/cron/embed-jobs nightly)
                        │
                        ▼
        lib/embed-knowledge.ts  →  lib/chunking.ts
                        │ split article into chunks
                        ▼
        lib/embeddings.ts  →  OpenRouter embeddings API
                        │ vector(1536)
                        ▼
              knowledge_chunks  (pgvector + HNSW index)

Chat time reads only:  knowledge_chunks / knowledge_articles
                       via match_knowledge_chunks_hybrid (SQL RPC)
```

CLI equivalents: `npm run embed-knowledge`, `npm run search-knowledge`.

---

## 4. Auth & access (two separate systems)

```
PORTAL USERS (humans)                     API CALLERS (machines)
──────────────────────                    ──────────────────────
Supabase Auth (email + password)          tlh_live_… API key
session in cookies                        Authorization: Bearer … / X-API-Key
                                          
middleware.ts  (runs on /dashboard,        lib/api-auth.ts
/api/knowledge, /api/playground, /demo,     → SHA-256 hash
/login, /signup, /verify-email)             → match api_keys.key_hash
   │                                        → reject revoked keys
   ├ not logged in → /login
   ├ email not confirmed → /verify-email
   └ logged in on /login|/signup → /dashboard

Roles (knowledge_team_members):
  admin  → roles + full access
  editor → create/edit/publish/delete
  viewer → read-only
```

---

## 5. Billing & top-ups

```
Prepaid credits (credit_ledger = source of truth, balance = sum)

  Usage side                              Top-up side
  ──────────                              ───────────
  OpenRouter returns cost (USD)           Partner picks amount
        │                                       │
        ▼                                       ▼
  charge = cost × (1 + markup%)           create ToyyibPay bill
           × USD→MYR rate                  (billExternalReferenceNo)
  markup ≥ 30% (DB-enforced)                    │
        │                                        ▼
        ▼                                  partner pays (FPX / card)
  round up to nearest sen                        │
        │                                        ▼
        ▼                                  /api/toyyibpay/callback
  credit_ledger insert (debit)             /api/toyyibpay/return
        │                                        │
        ▼                                  re-verify with ToyyibPay
  balance drops                            API → credit ledger (once,
        │                                  idempotent)
        ▼
  below threshold? → Resend low-credit email (≤ once / 24h)
```

---

## 6. Portal surfaces (dashboard map)

```
/dashboard            overview
  ├── /api-keys        create / revoke tlh_live_ keys
  ├── /chat            chat logs (partner_chat_logs)
  ├── /usage           API usage stats (api_usage)
  ├── /playground      test the AI (same pipeline, no key needed)
  ├── /prompt          partner-specific prompt instructions
  ├── /billing         billing overview + low-credit alerts
  ├── /top-up          buy credits via ToyyibPay
  ├── /settings        account
  ├── /status          status page
  └── /knowledge       knowledge admin (knowledge team only)
        ├── /sources   GCS connection, sync, library, sync history
        ├── /prompt    shared AI prompt editor (ai_settings)
        ├── /pricing   markup % (admin, ≥ 30%)
        └── /team      knowledge roles (admin/editor/viewer)
```

Public pages: `/` landing, `/docs/*` API docs, `/demo`, `/login`, `/signup`,
`/verify-email`, `/status`.

---

## 7. Database at a glance

```
api_keys                 partner keys (hashed) + last_used_at
api_usage                per-request endpoint log (rate-limit counters)
profiles                 partner accounts (Supabase Auth)
partnerships/…           partner data

knowledge_articles       mirrored knowledge (read-only in app)
knowledge_chunks         vector(1536) chunks + pgvector index
knowledge_source_*       GCS connection, selections, sizes
knowledge_embed_jobs     embedding queue
knowledge_team_members   admin/editor/viewer roles

partner_chat_logs        conversations (memory + dashboard + billing)
chat_answer_cache        first-turn answer cache

credit_ledger            prepaid balance entries (sum = balance)
billing_* / toyyibpay_*  top-ups + markup settings
ai_settings              shared prompt + prompt modules
```

---

## 8. One-line summary per layer

| Layer | Job |
|-------|-----|
| `middleware.ts` | Gate dashboard pages by Supabase session + email confirmation |
| `app/api/v1/*` | Public partner API (chat, sessions, me, usage, health, openapi) |
| `app/api/knowledge/*` | Knowledge sync/embed endpoints (portal-authenticated) |
| `app/api/cron/*` | Scheduled GCS sync + embed queue sweep |
| `app/api/toyyibpay/*` | Payment callback + return (credit top-ups) |
| `app/actions/*` | Server Actions for dashboard mutations |
| `lib/chat.ts` | Orchestrates one chat request end-to-end |
| `lib/knowledge.ts` | Retrieval: hybrid vector+keyword with fallback |
| `lib/openrouter.ts` | Builds prompts, calls the AI, returns usage/cost |
| `lib/billing*.ts`, `lib/credit.ts` | Pricing, markup, ledger |
| `lib/gcs-sync.ts` | GCS → Supabase one-way mirror |
| `lib/embeddings.ts`, `lib/chunking.ts` | Text → vectors |
