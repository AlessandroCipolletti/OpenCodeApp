# OpenCodeApp

A framework for building AI-modifiable web applications. Write a private, stable core app — then expose extension points that end-users can safely modify using LLM-powered coding agents.

## What is OpenCodeApp?

OpenCodeApp separates your application into two layers:

| Layer | Who Controls It | Location |
|-------|----------------|----------|
| **Private core** | You (the developer) | `/packages/**`, `/apps/**` |
| **Public extensions** | End-users (via AI agent) | `/tenants/<id>/extensions/**` |

The AI agent can **only** read and write files under `tenants/<tenantId>/extensions/`. Everything else is immutable from the agent's perspective.

## Private vs Public Code

**PRIVATE (never modified by the agent):**
- `/packages/` — Framework runtime, SDK, LLM, DB, agent logic
- `/apps/` — Core Next.js frontend and NestJS backend

**PUBLIC (agent-modifiable):**
- `/tenants/<tenantId>/extensions/` — UI components, extension logic, CSS

## Project Structure

```
/opencodeapp
  /apps
    /web                      # Next.js 14 App Router frontend
    /api                      # NestJS backend
  /packages
    /opencodeapp-core         # PRIVATE framework runtime & policies
    /opencodeapp-sdk          # PUBLIC SDK for extensions
    /opencodeapp-ext          # Extension bundler & loader (esbuild)
    /opencodeapp-agent        # LLM coding agent orchestrator
    /opencodeapp-llm          # LLM providers (Mock, OpenAI)
    /opencodeapp-db           # Prisma schemas & migrations
    /opencodeapp-cli          # CLI utilities
  /tenants
    /tenant-1
      /extensions
        /ui                   # AI-modifiable extension pages
      /releases               # Snapshot history
  docker-compose.yml
  package.json
```

## Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- npm >= 9

## Running Locally

PostgreSQL runs in Docker. The app (API + Next.js) runs on your machine.

### One command (recommended)

```bash
git clone https://github.com/AlessandroCipolletti/OpenCodeApp.git
cd OpenCodeApp
npm install
npm run dev:local
```

`dev:local` will:
1. Create `.env` from `.env.example` if missing/empty
2. Start the Postgres container (`docker compose up -d --wait`), creating it if needed
3. Run migrations and seed (`tenant-1`)
4. Start API + web

- Frontend: http://localhost:3000 (port from `WEB_PORT` in `.env`)
- Backend API: http://localhost:3001/api (port from `API_PORT` in `.env`)
- Postgres: `localhost:5434` (see `.env`)

### Manual steps (optional)

```bash
cp .env.example .env          # edit ports/passwords if you want
npm run db:up                 # docker compose up -d --wait
npm run db:migrate
npm run db:seed
npm run dev
```

Stop the database container with `npm run db:down`.

## Pages

| URL | Description |
|-----|-------------|
| `/` | Home page |
| `/items?tenant=tenant-1` | Core items CRUD |
| `/ext/custom-items?tenant=tenant-1` | AI-modifiable extension page |
| `/settings?tenant=tenant-1` | Configure LLM provider & API key |
| `/history?tenant=tenant-1` | Release history & rollback |

## Adding Extensions

Extensions live in `tenants/<tenantId>/extensions/<name>/`.

Each extension needs:
- `manifest.json` — defines capabilities, routes, DB usage
- `index.tsx` — React component (entry point)
- Optionally: `db/migrations/*.sql` for extension-owned tables (must use `ext_` prefix)

### Example manifest.json

```json
{
  "id": "my-extension",
  "name": "My Extension",
  "version": "0.1.0",
  "capabilities": [{ "type": "ui.page" }],
  "routes": [{ "slug": "my-page", "title": "My Page" }],
  "entry": "index.tsx"
}
```

## LLM & AI Widget

### Configuring the LLM

1. Go to `/settings?tenant=tenant-1`
2. Select provider: **Mock** (no key needed) or **OpenAI**
3. Enter your API key
4. Save

### The AI Widget

A floating ✨ button appears in the bottom-right of every page. **It only renders when an LLM key is configured** (or the Mock provider is selected).

Click it to:
- Type a natural language request
- Record your voice (uses browser MediaRecorder + Whisper transcription)
- Submit to the agent

The agent will:
1. Load your extension code as context
2. Call the LLM to generate a unified diff patch
3. Validate all paths (only extensions/ allowed)
4. Apply the patch to disk
5. Create a versioned release snapshot
6. Update the active release

### Supported Providers

| Provider | Key Required | Notes |
|----------|-------------|-------|
| Mock | No | Returns simulated patches for testing |
| OpenAI | Yes | Uses GPT-4o for code generation, Whisper for voice |

## History & Rollback

Every agent change creates a **release snapshot** — a full copy of your extension code at that point in time.

### Via UI
Go to `/history?tenant=tenant-1` and click **Rollback** on any previous version.

### Via CLI

```bash
# List releases
npm run cli -- history:list tenant-1

# Rollback to version 2
npm run cli -- history:rollback tenant-1 2 --reason "Bad change"
```

## CLI Reference

```bash
npm run cli -- <command>

Commands:
  tenant:create <slug>          Create a new tenant
  ext:build <tenant-slug>       Build extension bundles
  history:list <tenant-slug>    List releases for a tenant
  history:rollback <slug> <v>   Rollback to a specific version
```

## Multi-Tenancy

Tenants are identified by the `?tenant=<slug>` query parameter.

Each tenant has:
- Independent DB records (tenant-scoped in global tables)
- Independent extension code on disk
- Independent LLM API keys (encrypted)
- Independent release history

## Extension SDK

Extensions interact with the framework via a typed SDK injected at runtime:

```typescript
import type { OpenCodeAppSdk } from '@opencodeapp/sdk';

// sdk is injected by the framework - extensions never import it directly
declare const sdk: OpenCodeAppSdk;

// Query extension-owned data
const items = await sdk.data.query({ table: 'ext_my_items', limit: 10 });

// Insert into extension table
await sdk.data.insert({ table: 'ext_my_items', data: { name: 'foo' } });

// Register a scheduled job
sdk.scheduler.registerJob({ name: 'sync', cron: '0 * * * *', handler: async () => {} });

// Safe HTTP fetch (requires listed domain)
const data = await sdk.http.fetchAllowed({ url: 'https://api.example.com/data' });

// Audit logging
await sdk.audit.log({ action: 'page_viewed', details: { page: 'custom-items' } });
```

**Extensions must NEVER:**
- Import `@prisma/client` directly
- Access `process.env` for secrets
- Import from `@opencodeapp/core` (private)

## Security

- Agent path validation: any patch targeting files outside `tenants/<id>/extensions/` is **rejected**
- Extension SQL migrations: `DROP TABLE`, `ALTER TABLE`, `TRUNCATE` on non-`ext_` tables are **blocked**
- LLM API keys: stored AES-256-CBC encrypted at rest, never sent to the frontend
- Audio uploads: 10MB max size limit
- HTTP allow-list: `sdk.http.fetchAllowed()` validates against `ALLOWED_HTTP_DOMAINS` env var

## Building for Production

```bash
# Build all packages
npm run build

# Build extension bundles
npm run cli -- ext:build tenant-1
```

## Reusing the Framework

To use OpenCodeApp for your own project:

1. Fork this repository
2. Modify `/apps/web` and `/apps/api` for your core application
3. Keep `/packages/` intact (the framework)
4. Create your tenants under `/tenants/`
5. Users modify only their tenant's extensions via the AI agent

The framework handles: agent orchestration, LLM integration, path safety, versioning, rollback, and multi-tenancy.
