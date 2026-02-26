# OpenCodeApp

A multi-tenant, AI-powered coding agent platform. Each tenant gets isolated extension sandboxes that a coding agent can modify via natural language prompts — while the core framework remains immutable.

---

## Architecture

```
/apps
  /web          Next.js 14 (App Router) frontend
  /api          NestJS REST API + Swagger
/packages
  /opencodeapp-core    PRIVATE — tenant context, access policy, extension loader
  /opencodeapp-sdk     PUBLIC  — capability-based SDK for extensions
  /opencodeapp-ext     Extension manifest, bundler, and loader
  /opencodeapp-agent   Coding agent orchestrator + patch recorder + rollback
  /opencodeapp-llm     OpenAI provider + BYO key resolution
  /opencodeapp-db      Prisma schema, migrations, safe SQL runner
  /opencodeapp-cli     CLI (tenant:create, agent:run, rollback…)
/tenants
  /tenant-1
    /extensions   ← ONLY this directory is writable by the agent
    /releases     Point-in-time snapshots for rollback
```

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), Tailwind CSS |
| Backend | NestJS 10, Swagger/OpenAPI |
| Database | PostgreSQL 15 + Prisma ORM |
| LLM | OpenAI (gpt-4o by default); BYO key per tenant |
| Monorepo | npm workspaces |
| Runtime | Node ≥ 18 |
| Local dev | Docker Compose |

---

## Quick Start

### Prerequisites
- Node 18+
- Docker & Docker Compose

### 1. Clone and set up environment

```bash
git clone <repo-url>
cd OpenCodeApp
cp .env.example .env
# Edit .env — set OPENAI_API_KEY at minimum
```

### 2. Start with Docker Compose

```bash
docker-compose up
```

Services:
- PostgreSQL on `localhost:5432`
- API on `http://localhost:3001` (Swagger at `/api/docs`)
- Web on `http://localhost:3000`

### 3. Run database migrations

```bash
npm run db:migrate
```

### 4. Generate Prisma client

```bash
npm run db:generate
```

---

## CLI Usage

Build the CLI first:

```bash
npm run build -w packages/opencodeapp-cli
```

Then:

```bash
# Create a tenant
opencodeapp tenant:create "Acme Corp"

# List tenants
opencodeapp tenant list

# Run the agent
opencodeapp agent:run tenant-1 "Add a notes feature to the UI extension"

# Roll back
opencodeapp rollback tenant-1 <releaseId>
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/tenants` | List all tenants |
| POST | `/tenants` | Create a tenant |
| GET | `/items?tenant=<slug>` | List items for a tenant |
| POST | `/items?tenant=<slug>` | Create an item |
| GET | `/extensions?tenant=<slug>` | List extensions |
| POST | `/agent/run?tenant=<slug>` | Run the coding agent |
| GET | `/agent/requests?tenant=<slug>` | List agent change requests |
| GET | `/agent/releases?tenant=<slug>` | List releases |

Full Swagger documentation: `http://localhost:3001/api/docs`

---

## Extension System

Extensions live in `tenants/{tenantId}/extensions/{extensionName}/` and consist of:

- **`manifest.json`** — declares name, version, capabilities, pages, routes
- **`pages/`** — React components for UI pages (served at `/ext/{tenantId}/{pageName}`)
- **`db/migrations/`** — SQL migrations (tables must be prefixed `ext_`)

### Capabilities

```
data:read    — sdk.data.query(...)
data:write   — sdk.data.insert(...)
scheduler    — sdk.scheduler.registerJob(...)
http         — sdk.http.fetchAllowed(...)
ui           — sdk.ui.registerPage(...)
audit        — sdk.audit.log(...)
```

### Example manifest

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "capabilities": ["data:read", "ui"],
  "pages": [{ "name": "dashboard", "file": "pages/dashboard.tsx" }]
}
```

---

## Security & Immutability

| Zone | Writable by agent? |
|---|---|
| `apps/`, `packages/` | ❌ NEVER |
| `tenants/{id}/extensions/` | ✅ Only here |
| `tenants/{id}/releases/` | ❌ (managed by RollbackManager) |

- **PathGuard** rejects any file path outside the sandbox at runtime.
- **ExtensionMigrationRunner** validates SQL before execution — forbids `DROP`, `TRUNCATE`, `ALTER` on core tables, and requires `ext_` prefix on new tables.
- Extensions access data only through the typed **SDK** — no raw DB or secret access.

---

## Development

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Build a single package
npm run build -w packages/opencodeapp-sdk
```

---

## License

See [LICENSE](./LICENSE).
