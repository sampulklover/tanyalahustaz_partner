# Tanyalah Ustaz Partner — Architecture

How the whole system fits together: who talks to whom, what runs when, and
where each piece lives. Written to be read top-down — start with the big
picture, then zoom into the part you care about.

> Companion docs: [README](../README.md) (setup + features) and
> [SYSTEM_EVOLUTION.md](SYSTEM_EVOLUTION.md) (why it grew this way).

---

## 1. The big picture

Two audiences, one Next.js server.

```mermaid
flowchart TB
    subgraph Partners["Partner websites (machines)"]
        PS[Their site / app]
    end
    subgraph Users["Humans"]
        AD[Partner owner / admin]
        KU[Knowledge team]
    end
    subgraph Visitors["Logged-out visitors"]
        VV[Landing, docs, demo, status]
    end

    PS -->|"POST /api/v1/chat\nBearer tlh_live_…"| NW
    AD -->|"Supabase login"| NW
    KU -->|"Supabase login"| NW
    VV -->|"public pages"| NW

    NW["Next.js app (Vercel)\nmiddleware + routes + server actions"]
    NW --> SB[("Supabase\nPostgres + Auth + pgvector")]
    NW --> OR["OpenRouter\nchat + embeddings"]
    NW --> GCS[("Google Cloud Storage\nknowledge source of truth")]
    NW --> TP["ToyyibPay\nMYR top-ups"]
    NW --> RS["Resend\nlow-credit emails"]
```

Two auth systems live side by side:

- **Humans** — Supabase Auth. A cookie session, checked in `middleware.ts`.
- **Machines** — API keys (`tlh_live_…`). SHA-256 hashed, checked per request.

---

## 2. Request lifecycle: a partner chat call

`POST /api/v1/chat` is the main integration endpoint.

```mermaid
sequenceDiagram
    participant P as Partner site
    participant R as /api/v1/chat
    participant K as lib/api-auth.ts
    participant E as lib/embeddings.ts
    participant DB as Supabase (pgvector)
    participant C as lib/chat.ts + openrouter.ts
    participant OR as OpenRouter
    participant L as partner_chat_logs

    P->>R: message, category?, session_id?
    R->>K: validate Bearer key (SHA-256), rate-limit
    K-->>R: partner account
    R->>E: embed the question
    E-->>R: vector
    R->>DB: match_knowledge_chunks(embedding, category)
    DB-->>R: top chunks
    R->>DB: load chat history for session_id
    R->>C: build prompt (shared + partner prompt + chunks)
    C->>OR: completion request
    OR-->>C: reply + usage.cost
    R->>L: log request
    R->>DB: charge credit ledger (cost × markup × rate)
    R-->>P: reply + sources + session_id
```

Supporting modules:

| File | Responsibility |
|------|----------------|
| `lib/api-auth.ts` | Bearer key validation + rate limiting |
| `lib/retrieval.ts` | Vector search, keyword fallback, thresholds |
| `lib/rag-context.ts` | Turn chunks into prompt reference material |
| `lib/chat.ts` | Orchestrate retrieval → prompt → model |
| `lib/chat-stream.ts` | Streaming variant of the same pipeline |
| `lib/openrouter.ts` | OpenRouter HTTP client |
| `lib/chat-history.ts` | Multi-turn session memory (`session_id`) |

Greetings and small talk skip retrieval entirely (`lib/small-talk.ts`), so they
never produce random citations.

---

## 3. The dashboard (partner portal)

```mermaid
flowchart LR
    LOGIN[/login · /signup · /verify-email/] --> MID{{middleware.ts\nguard + email check}}
    MID --> DASH["/dashboard"]
    DASH --> APIK[API keys]
    DASH --> LOGS[Chat logs]
    DASH --> USE[Usage]
    DASH --> PLAY[Playground]
    DASH --> PROMPT[AI prompt]
    DASH --> PKB[My knowledge]
    DASH --> BILL[Billing]
    DASH --> TOP[Top up]
    DASH --> KNOW[Knowledge]
    DASH --> SET[Settings]
```

- Writes happen in **server actions** under `app/actions/`.
- `middleware.ts` redirects logged-out users to `/login`, and logged-in but
  unverified users to `/verify-email`.

---

## 4. Knowledge pipeline (GCS → Supabase → AI)

Google Cloud Storage is the **source of truth**. Supabase keeps a **read-only
mirror**. The app never authors knowledge.

```mermaid
flowchart TB
    GCS[("Google Cloud Storage bucket\n· source of truth ·")]
    SEL[["knowledge_source_selections\n(ticked folders/files)"]]
    SYNC["lib/gcs-sync.ts\nSync run"]
    ART[("knowledge_articles\nread-only mirror")]
    JOB[["knowledge_embed_jobs\nqueue"]]
    CHUNK[("knowledge_chunks\nvectors")]
    CRON1["/api/cron/gcs-sync\n2:00 AM"]
    CRON2["/api/cron/embed-jobs\n12:00 AM"]

    SEL --> SYNC
    GCS -->|"read selected objects"| SYNC
    SYNC -->|"create / update / delete"| ART
    SYNC -->|"changed → queue"| JOB
    JOB --> CHUNK
    CRON1 --> SYNC
    CRON2 --> JOB
    CHUNK -->|"retrieval for chat"| CHAT["Chat answers"]
```

Rules baked in:

- **One-way only** — Google Cloud is truth; the mirror is disposable.
- **Selection-driven** — only ticked folders/files sync, never the whole bucket.
- **Change detection** — compares object `generation`; unchanged files skip.
- **RAG** — only retrieved chunks reach the prompt, never the whole base.

### Partner knowledge (private, per-partner)

Alongside the shared library, each partner can upload their **own** documents at
`/dashboard/knowledge-base`. These are stored in `partner_knowledge_files` /
`partner_knowledge_chunks` — separate tables from the shared ones, scoped to one
`partner_id` with RLS, and searched by `match_partner_knowledge_chunks_hybrid`.
At chat time both libraries are retrieved in parallel and injected as distinct
prompt sections; a partner's files are **never** visible to another partner.
Embedding a file is billed to that partner's credit ledger (`reason =
'embedding'`, same markup as chat). See `lib/partner-knowledge.ts` and
`lib/partner-knowledge-search.ts`.

**Storage:** like the admin flow, the original file is never kept — it is
extracted to text in memory and discarded. Only the chunk rows (which already
contain the text) plus a short display preview are stored, so the text is not
duplicated.

---

## 5. Inside a sync run

```mermaid
flowchart TB
    A[Gather selected objects] --> B["Filter: supported types,\nexclude draft/cover folders"]
    B --> C{"Same generation\nas mirror?"}
    C -->|yes| D[Skip - unchanged]
    C -->|no| E{"Under\nper-run cap?"}
    E -->|no| F[Defer to next run]
    E -->|yes| G["Extract text → upsert article\nrecord created/updated path"]
    G --> H[Queue changed articles for embedding]
    H --> I["Embed job: chunk → vector → knowledge_chunks\nrecord OpenRouter cost"]
    I --> J["finishRun: counts + file paths + cost\n→ Sync history"]
```

Caps and knobs (`lib/gcs-sync.ts`, `.env`):

| Variable | Default | Meaning |
|----------|---------|---------|
| `GCS_SYNC_MAX_FILES` | 10 | Max new/changed files per run |
| `GCS_SYNC_CONCURRENCY` | 4 | Files downloaded/extracted/inserted in parallel |
| `GCS_SYNC_MAX_BYTES` | 100 MB | Max file size to read |
| `GCS_SYNC_EXCLUDE_PREFIXES` | cover-image, cover, covers | Folders to skip |
| `GCS_SYNC_EXTENSIONS` | all supported | Limit to e.g. `.pdf` |
| `GCS_AI_STRUCTURING` | off | Let the model draft fields |

Sync history stores aggregate counts, per-file paths (capped), errors, and the
recorded embedding cost per run.

---

## 6. Billing & money flow

```mermaid
flowchart LR
    P[Partner] -->|picks amount| TP[ToyyibPay bill]
    TP -->|"callback + return\n(both re-verify)"| CRED[credit_ledger +balance]
    CHAT[Chat request] -->|"OpenRouter usage.cost\n× markup ≥30%\n× USD→MYR rate"| CHARGE[charge credit_ledger]
    CHARGE --> BAL[balance = Σ ledger]
    BAL -->|"≤ threshold"| ALERT[Resend low-credit email]
    BAL -->|"0"| STOP[request still served*]
```

\* Charging is recorded but never blocks a request in the current code.

Pricing (`lib/billing.ts`, `lib/credit.ts`):

```
partner charge = OpenRouter cost (USD) × (1 + markup%) × USD→MYR rate
```

- Markup floor of **30%** is enforced by the database.
- `OPENROUTER_USD_MYR_RATE` defaults to `4.7`.
- Top-ups are idempotent: both `/api/toyyibpay/callback` and `/return` re-check
  the bill before crediting.

---

## 7. Data model (core tables)

```mermaid
erDiagram
    profiles ||--o{ api_keys : owns
    profiles ||--o{ partner_chat_logs : logs
    api_keys ||--o{ partner_chat_logs : authenticates
    knowledge_articles ||--o{ knowledge_chunks : "chunked into"
    knowledge_source_selections }o--|| knowledge_articles : "produce (via sync)"
    knowledge_sync_runs ||--o{ knowledge_embed_jobs : queues
    knowledge_embed_jobs ||--o{ knowledge_chunks : writes
    profiles ||--o{ credit_ledger : charged
    knowledge_team_members }o--|| profiles : "roles"
    ai_settings ||--|| knowledge_articles : "prompt config"
    profiles ||--o{ partner_knowledge_files : uploads
    partner_knowledge_files ||--o{ partner_knowledge_chunks : "chunked into"
```

---

## 8. Scheduled work (Vercel Cron)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/gcs-sync` | `0 2 * * *` (2 AM) | Pull selected bucket files, queue embeddings |
| `/api/cron/embed-jobs` | `0 0 * * *` (12 AM) | Sweep any remaining embedding jobs |

Primary embedding work also runs in the background right after a sync, and
admins can flush the queue on demand from **Sources → Process queue**.

---

## 9. Where things live

| Path | Role |
|------|------|
| `app/api/v1/` | Public partner API: chat, sessions, me, usage, health, openapi |
| `app/api/cron/` | Scheduled GCS sync + embed-job sweeper |
| `app/api/toyyibpay/` | Payment callback + return |
| `app/api/knowledge/` | Dashboard-internal knowledge endpoints (preview, sync, embed) |
| `app/dashboard/` | Partner portal (auth-gated) |
| `app/actions/` | Server actions — all portal writes |
| `app/docs/` | Public API documentation |
| `lib/gcs-sync.ts` | Knowledge mirror engine |
| `lib/embeddings.ts` + `lib/embed-knowledge.ts` | Vectors + cost tracking |
| `lib/chat.ts` + `lib/retrieval.ts` + `lib/rag-context.ts` | RAG answer pipeline |
| `lib/partner-knowledge.ts` + `lib/partner-knowledge-search.ts` | Private per-partner file knowledge base |
| `lib/billing.ts` + `lib/credit.ts` | Pricing + ledger |
| `middleware.ts` | Auth + email-verification guard |
| `supabase/migrations/` | Schema history |

---

## One-line summary

> Partners call a chat API with a key; the server embeds the question, finds
> relevant chunks in Supabase (mirrored from Google Cloud Storage), asks
> OpenRouter, logs and charges the answer — while humans manage keys, knowledge,
> prompts, and billing from a Supabase-auth dashboard.
