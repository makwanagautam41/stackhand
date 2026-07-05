# Stackhand

Personal Docker/YAML stack manager — manage docker-compose stacks, containers, images, volumes, and Ollama AI from a web UI.

---

## Quick Start (Development)

```bash
npm run setup       # Install deps, generate Prisma, run migrations, seed
npm run dev         # Start backend (:4000) + frontend dev server (:3000)
```

The frontend dev server proxies `/api` and `/socket.io` to the NestJS backend.

---

## Usage (Shell Function)

Add the following to your shell config (`~/.zshrc`, `~/.bashrc`, or `~/.config/shell/common.sh`):

```bash
STACKHAND_DIR="$HOME/Workspace/stackhand"
SH_API_LOG="$STACKHAND_DIR/stackhand-api.log"
SH_UI_LOG="$STACKHAND_DIR/stackhand-ui.log"

stackhand() {
  local api_pid_file="$STACKHAND_DIR/.api.pid"
  local ui_pid_file="$STACKHAND_DIR/.ui.pid"

  case "${1:-start}" in
    start)
      cd "$STACKHAND_DIR" || return 1
      [ ! -f dist/src/main.js ] && npm run build
      # Start backend (API)
      nohup node dist/src/main.js >> "$SH_API_LOG" 2>&1 &
      echo $! > "$api_pid_file"
      # Start frontend (SSR dev server)
      cd client && nohup npx vite dev --host 0.0.0.0 >> "$SH_UI_LOG" 2>&1 &
      echo $! > "$ui_pid_file"
      cd "$STACKHAND_DIR"
      echo "Stackhand started"
      echo "  API:  http://localhost:${PORT:-22443}"
      echo "  UI:   http://localhost:${FRONTEND_PORT:-22080}"
      ;;
    stop)
      local stopped=false
      [ -f "$api_pid_file" ] && kill "$(cat "$api_pid_file")" 2>/dev/null && rm -f "$api_pid_file" && stopped=true
      [ -f "$ui_pid_file" ] && kill "$(cat "$ui_pid_file")" 2>/dev/null && rm -f "$ui_pid_file" && stopped=true
      $stopped && echo "Stopped" || echo "Not running"
      ;;
    restart)
      stackhand stop; sleep 1; stackhand start
      ;;
    build)
      cd "$STACKHAND_DIR" && npm run build
      ;;
    logs)
      local f="${2:-api}"
      case "$f" in
        api) tail -f "$SH_API_LOG" ;;
        ui)  tail -f "$SH_UI_LOG" ;;
        *)   echo "Usage: stackhand logs {api|ui}" ;;
      esac
      ;;
    *)
      echo "Usage: stackhand {start|stop|restart|build|logs [api|ui]}"
      ;;
  esac
}
```

Then reload your shell and use:

```bash
stackhand start       # Build (if needed) + start API + UI
stackhand stop        # Stop both servers
stackhand restart     # Restart
stackhand build       # Rebuild only
stackhand logs        # Tail API logs
stackhand logs ui     # Tail frontend logs
```

The frontend (port `FRONTEND_PORT`, default 22080) proxies `/api` and `/socket.io` to the backend.

### Data Directory

Persistent data (SQLite database, workspaces) lives at `~/.local/share/stackhand/`. Configure via `.env` in the repo root.

### Uninstall

```bash
rm -rf ~/.local/share/stackhand ~/.config/stackhand
# Remove the function from your shell config
# Optionally remove .env: git checkout -- .env
```

---

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
│   ├── volume/        # Docker volume management
│   ├── registry/      # Docker registry management
│   ├── ollama/        # Ollama AI chat & compose generation
│   ├── dashboard/     # Aggregated overview data
│   ├── settings/      # Global & per-workspace settings
│   ├── database/      # Raw SQLite browser
│   ├── backup/        # Workspace backup & restore
│   ├── docker/        # Docker system info
│   ├── gateway/       # WebSocket gateway (logs, compose progress, stats, image pull, AI streaming)
│   ├── main.ts        # Entry point
│   └── app.module.ts  # Root module
├── client/            # TanStack Start (React SSR) frontend
├── prisma/            # Prisma schema & migrations
├── scripts/           # CLI wrapper & installer
│   ├── stackhand      # CLI command (installed to /usr/local/bin/)
│   └── install.sh     # System-wide installer
├── workspaces-data/   # SQLite database (dev — gitignored)
├── .env               # Environment variables
└── package.json       # Root scripts
```

---

## Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start backend + frontend dev server concurrently |
| `npm run dev:backend` | Backend only with watch mode |
| `npm run dev:frontend` | Frontend dev server only |
| `npm run build` | Build backend + frontend for production |
| `npm run start:prod` | Serve backend API |
| `npm run prisma:seed` | Seed default workspace |
| `npm run setup` | Full first-time setup (deps, prisma, seed) |

---

## API Endpoints

**Base URL**: `http://localhost:22443/api` (production) or `http://localhost:4000/api` (dev)

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
| **Volumes** | `GET /api/volumes`, `DELETE /api/volumes/:name` |
| **Registries** | `GET/POST/PATCH/DELETE /api/registries` |
| **Ollama** | `GET /api/ollama/status\|models`, `POST /api/ollama/chat`, `POST /api/ollama/generate-stack` |
| **Dashboard** | `GET /api/dashboard` |
| **Settings** | `GET\|PUT /api/settings` |
| **Database** | `GET /api/database/tables`, schema, rows, query |
| **Backup** | `POST /api/backup/export\|import`, `GET /api/backup/list`, `DELETE /api/backup/:id` |
| **Docker** | `GET /api/docker/info` |
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

---

## Environment Variables

See `.env.example`. Key variables:

| Variable | Default | Description |
|---|---|---|
| `STACKHAND_API_TOKEN` | — | Bearer token for API auth (required) |
| `PORT` | `22443` | Backend port |
| `FRONTEND_PORT` | `22080` | Frontend dev server port |
| `HOST` | `0.0.0.0` | Backend bind host |
| `DEFAULT_WORKSPACE_ROOT` | — | Default directory for workspace stacks |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `DATABASE_URL` | `file:./workspaces-data/stackhand.db` | SQLite database path |

---

## Prerequisites

- Node.js 20+
- Docker Engine running (for container/stack features)
- Ollama running (optional, for AI features)
