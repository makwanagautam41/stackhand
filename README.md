# Stackhand

Personal Docker/YAML stack manager — manage docker-compose stacks, containers, images, and Ollama AI from a web UI.

## Project Structure

```
├── src/               # NestJS backend (TypeScript)
│   ├── auth/          # Bearer token guard
│   ├── common/        # Shared utilities (path validation, exception filter, activity logger)
│   ├── prisma/        # Prisma service (SQLite via Prisma ORM)
│   ├── workspace/     # Workspace CRUD
│   ├── filesystem/    # File/folder browsing & YAML editing
│   ├── stack/         # Docker Compose stack management
│   ├── container/     # Docker container management (via dockerode)
│   ├── image/         # Docker image management & Docker Hub search
│   ├── ollama/        # Ollama AI chat & compose generation
│   ├── dashboard/     # Aggregated overview data
│   ├── settings/      # Global & per-workspace settings
│   ├── gateway/       # WebSocket gateway (logs, compose progress, stats, image pull, AI streaming)
│   ├── main.ts        # Entry point
│   └── app.module.ts  # Root module
├── client/           # TanStack Start (React SSR) frontend
├── prisma/           # Prisma schema & migrations
├── workspaces-data/  # SQLite database (auto-created)
├── .env              # Environment variables
└── package.json      # Root scripts
```

## Quick Start

```bash
# 1. Install dependencies
npm run setup

# 2. Start development (backend on :4000, frontend on :3000)
npm run dev
```

The frontend dev server proxies `/api` and `/socket.io` to the NestJS backend.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend (`:4000`) + frontend dev server (`:3000`) concurrently |
| `npm run dev:backend` | Backend only with watch mode |
| `npm run dev:frontend` | Frontend dev server only |
| `npm run build` | Build backend + frontend |
| `npm run start:prod` | Serve backend API on `:4000` |
| `npm run prisma:seed` | Seed default workspace |
| `npm run setup` | Full first-time setup |

## API Endpoints

**Base URL**: `http://localhost:4000/api`

### Auth
All `/api` routes require `Authorization: Bearer <STACKHAND_API_TOKEN>` header.  
The `/api/health` endpoint is public.

### Modules & Endpoints

| Module | Endpoints |
|---|---|
| **Health** | `GET /api/health` |
| **Workspaces** | `GET/POST /api/workspaces`, `GET/PATCH/DELETE /api/workspaces/:id`, `POST /api/workspaces/validate-path` |
| **Filesystem** | `POST /api/filesystem/browse`, `read`, `write`, `create-folder`, `rename`, `delete`, `duplicate` |
| **Stacks** | `GET /api/workspaces/:wid/stacks`, `POST /api/workspaces/:wid/stacks`, `GET/POST/DELETE /api/stacks/:id`, `POST /api/stacks/:id/up\|down\|restart`, `GET /api/stacks/:id/logs` |
| **Containers** | `GET /api/containers`, `GET/:id`, `POST/:id/start\|stop\|restart`, `DELETE/:id`, `GET/:id/stats` |
| **Images** | `GET /api/images`, `GET /api/images/search?q=`, `POST /api/images/pull`, `DELETE /api/images/:name` |
| **Ollama** | `GET /api/ollama/status\|models`, `POST /api/ollama/chat`, `POST /api/ollama/generate-stack` |
| **Dashboard** | `GET /api/dashboard` |
| **Settings** | `GET\|PUT /api/settings` |
| **Swagger** | `GET /api/docs` (interactive API documentation) |

### WebSocket Events (Socket.IO)

| Event | Direction | Description |
|---|---|---|
| `stack:logs` | Client→Server | Subscribe to live compose logs |
| `stack:logs:stop` | Client→Server | Stop log streaming |
| `stack:compose-progress` | Client→Server | Subscribe to compose up/down output |
| `container:stats` | Client→Server | Subscribe to real-time container stats (3s interval) |
| `container:stats:stop` | Client→Server | Stop stats polling |
| `image:pull-progress` | Client→Server | Subscribe to image pull progress |
| `ollama:chat-stream` | Client→Server | Stream AI chat response tokens |

## Environment Variables

See `.env.example`. Key variables:

- `STACKHAND_API_TOKEN` — Bearer token for API auth (required)
- `PORT` — Backend port (default: 4000)
- `OLLAMA_BASE_URL` — Ollama API endpoint (default: http://localhost:11434)
- `DATABASE_URL` — SQLite database path

## Fake (Simulated) Mode

The frontend can run entirely client-side with mock data using the TanStack Start dev server.  
No backend needed — all data is stored in-memory and localStorage.

To run in fake mode:

```bash
cd client && npm run dev
```

## Real Mode (Backend + Frontend)

Run both servers for the full experience:

```bash
npm run dev
```

The frontend (port 3000) proxies API calls to the backend (port 4000).  
The backend serves Swagger docs at `/api/docs`.

### Prerequisites

- Node.js 20+
- Docker Engine running (for container/stack features)
- Ollama running (optional, for AI features)
