# Tanyalah Ustaz Partner API — System Evolution

A short history of how this project grew, so future you (or your team) can understand **why** things are built this way.

---

## What this system is

A **partner platform** for websites that want Tanyalah Ustaz Islamic AI:

- Partners **sign up**, get **API keys**, read **docs**, test in a **playground**
- They call **`POST /api/v1/chat`** from their site
- We answer using **our knowledge base** + **OpenRouter** (we own the AI layer; partners never touch OpenRouter or Supabase directly)

---

## Evolution (3 phases)

### Phase 1 — Developer portal + API keys

**Goal:** Prove the partner API model.

| Added | Why |
|-------|-----|
| Next.js app (landing, login, dashboard) | Partner self-service |
| Supabase Auth | Portal login |
| `api_keys` table (hashed) | Partner authentication for API |
| `GET /api/v1/me`, `GET /api/v1/health` | Basic API surface |
| Service role / secret key on server | Server talks to DB; partners never get Supabase access |

**Lesson:** Two auth systems — **portal login** (humans) vs **API keys** (machines).

---

### Phase 2 — AI chat + knowledge base

**Goal:** Real product — Islamic AI for partners, not dummy CRUD.

| Added | Why |
|-------|-----|
| `knowledge_articles` | Curated content we control (fiqh, ibadah, etc.) |
| `POST /api/v1/chat` | Main integration endpoint |
| OpenRouter | AI generation (we don't host models) |
| `partner_chat_logs` | Audit + dashboard visibility |
| Playground | Partners test without curl |
| Keyword search (top 4 articles) | First version of “find relevant knowledge” |

**Flow:** Question → find articles → put in prompt → OpenRouter → reply + sources.

**Lesson:** Partners integrate one API; we manage knowledge + AI behind it.

---

### Phase 3 — Production-ready RAG + memory

**Goal:** Scale knowledge and support real conversations.

| Added | Why |
|-------|-----|
| `knowledge_chunks` + **pgvector** | Semantic search (meaning, not just keywords) |
| **Embeddings** via OpenRouter | Text → vectors for similarity search |
| `match_knowledge_chunks()` | Postgres finds closest chunks |
| `npm run embed-knowledge` | Build/update vectors after content changes |
| **Session memory** | Same `session_id` → previous turns sent to AI |
| **Category filter** | e.g. `"fiqh"` limits search scope |
| Keyword fallback | Works if embeddings not generated yet |

**Flow today:**

```
User message
  → embed question
  → vector search (top chunks, optional category)
  → load chat history (session_id)
  → prompt + OpenRouter
  → reply + sources + log
```

**Lesson:** Don’t send all knowledge every time — **retrieve a little, then generate** (RAG).

---

## Architecture (current)

```
Partner website          Portal (logged in)
      │                        │
      │ tlh_live_ API key      │ Supabase Auth session
      ▼                        ▼
              Next.js server
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   Validate      Knowledge      OpenRouter
   API key        (pgvector)     (chat + embed)
        │             │             │
        └─────────────┴─────────────┘
                      ▼
                 Supabase (Postgres)
```

---

## Key concepts (cheat sheet)

| Term | One line |
|------|----------|
| **API key** (`tlh_live_...`) | Partner’s key to call our API |
| **Secret key** (`sb_secret_...`) | Our server’s key to access Supabase (never in browser) |
| **Embedding** | Text turned into numbers so similar meanings sit close together |
| **RAG** | Retrieve relevant chunks → add to prompt → generate answer |
| **session_id** | Groups messages into one conversation (memory + logs) |
| **Playground** | Dashboard UI; same AI pipeline as API, no partner key needed |

---

## Env vars that matter

| Variable | Who uses it |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_*` | Portal (browser-safe) |
| `SUPABASE_SECRET_KEY` | Server → database |
| `OPENROUTER_API_KEY` | Server → AI chat |
| `OPENROUTER_EMBEDDING_MODEL` | Server → embeddings (default: NVIDIA free, 2048-dim) |

---

## When you change things

| Change | Also do |
|--------|---------|
| Add/edit `knowledge_articles` | `npm run embed-knowledge` |
| **Change `OPENROUTER_EMBEDDING_MODEL`** | Update `EMBEDDING_DIMENSIONS` in `lib/embeddings.ts`, migrate DB vector size if needed, truncate `knowledge_chunks`, then **`npm run embed-knowledge`** |
| New migration | Run SQL in Supabase, in order |
| New API endpoint | Auth with API key + log usage |
| Deploy | Set all env vars on Vercel; never commit `.env` |

---

## Changing the embedding model

Different models output different vector sizes (e.g. **1536** for `openai/text-embedding-3-small`, **2048** for `nvidia/llama-nemotron-embed-vl-1b-v2:free`). Old and new vectors **cannot be mixed**.

**Checklist when switching models:**

1. Set new `OPENROUTER_EMBEDDING_MODEL` in `.env`
2. Set matching `EMBEDDING_DIMENSIONS` in `lib/embeddings.ts`
3. If dimensions changed: SQL migration on `knowledge_chunks` — truncate table, change `vector(N)`, update `match_knowledge_chunks`
4. Run **`npm run embed-knowledge`** to rebuild all chunks
5. Test in playground

| Model | Dimensions | HNSW index (≤2000 only) |
|-------|------------|-------------------------|
| `nvidia/llama-nemotron-embed-vl-1b-v2:free` | 2048 | No (exact search) |
| `openai/text-embedding-3-small` | 1536 | Yes (optional, faster at scale) |

**Rule:** change model → new vectors → always re-run `npm run embed-knowledge`.

---

## Sensible next steps (not built yet)

- Rate limits + billing per partner/key
- Streaming responses for chat widgets
- Stronger chunking/reranking as content grows

---

## File map (where logic lives)

```
app/api/v1/chat/     → Public chat API
app/dashboard/       → Portal + playground
lib/chat.ts          → Orchestrates one chat request
lib/knowledge.ts     → Vector search + fallback
lib/embeddings.ts    → Create vectors
lib/openrouter.ts    → AI replies
lib/chat-history.ts  → Multi-turn memory
supabase/migrations/ → Schema history (run in order)
scripts/embed-knowledge.ts → Build vectors CLI (re-run after article edits or model change)
```

---

*Last updated: July 2026 — reflects Phase 3 (vector RAG + session memory) and admin knowledge CMS.*
