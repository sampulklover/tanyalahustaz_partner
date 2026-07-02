# TanyaLah Ustaz Partner API

Developer portal and API platform built with **Next.js** and **Supabase**.

Partners can sign up, log in, create API keys, read documentation, and call a versioned REST API. Supabase handles auth and data storage; the Next.js API layer validates keys and proxies requests — clients never get direct Supabase access.

## Architecture

```
Partner apps  →  Next.js /api/v1/*  →  Supabase (Postgres + Auth)
Developers    →  Next.js portal     →  Supabase Auth + api_keys table
```

## Features

- Landing page and documentation (`/docs`)
- Partner signup/login (Supabase Auth)
- Dashboard with API key create/revoke
- SHA-256 hashed API keys (shown once at creation)
- Public API: `GET /api/v1/health`, `GET /api/v1/me`
- Usage logging per API key
- Row Level Security on all tables

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project.
2. Copy your project URL and anon key.
3. Copy your **service role key** (Settings → API) — server-only.

### 3. Run the database migration

In the Supabase SQL Editor, run the migration:

```
supabase/migrations/20250702000000_initial_schema.sql
```

Or, if using the Supabase CLI:

```bash
supabase db push
```

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials and app URL.

### 5. Configure Supabase Auth redirect

In Supabase → Authentication → URL Configuration, add:

- **Site URL**: `http://localhost:3000` (or your production URL)
- **Redirect URLs**: `http://localhost:3000/auth/callback`

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## API usage

Create an API key in the dashboard, then:

```bash
curl http://localhost:3000/api/v1/me \
  -H "Authorization: Bearer tlh_live_YOUR_KEY"
```

## Project structure

```
app/
  api/v1/          # Public partner API
  dashboard/       # Protected partner portal
  docs/            # API documentation
  actions/         # Server actions (auth, keys)
lib/
  supabase/        # Browser, server, and admin clients
  api-auth.ts      # API key validation
  api-keys.ts      # Key generation and hashing
supabase/migrations/
```

## Security notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
- API keys are hashed before storage; the full key is shown only once.
- RLS is enabled on `profiles`, `api_keys`, and `api_usage`.
- Add rate limiting before production (e.g. Upstash, Vercel KV).

## Next steps

- Add your real business endpoints under `app/api/v1/`
- Add rate limiting and billing per key
- Generate OpenAPI spec from route handlers
- Deploy to Vercel and set production env vars
