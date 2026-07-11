# Workflow Guide

## Development Mode

```bash
npm run dev
```

Starts both servers with hot-reload:
- Backend: `http://localhost:4000` (auto-restarts on changes)
- Frontend: `http://localhost:22080` (instant browser updates)
- Database: `workspaces-data/dev.db` (separate from production)
- Workspace folder: `workspaces-data/dev-workspace/`

---

## Production Mode

### Start (both servers)

```bash
sudo systemctl start stackhand
```

Or manually: `npm run start`

- Backend API: `http://localhost:22443`
- Frontend UI: `http://localhost:22443`

### Stop / Logs

```bash
sudo systemctl stop stackhand
sudo journalctl -u stackhand -f
```

---

## Dev → Prod Update Workflow

After making changes in development, push them to production:

### 1. Only code changes (no schema changes)

```bash
npm run update
```

This runs: `build → prisma generate → prisma migrate deploy → restart service`

### 2. Code + database schema changes

After editing `prisma/schema.prisma`:

```bash
# In development, test the migration first:
npx prisma migrate dev --name describe_change
npm run dev          # verify it works

# Then apply to production:
npm run build                                  # rebuild backend + frontend
npx prisma generate                            # regenerate prisma client
npx prisma migrate deploy                      # apply migration to prod DB
sudo systemctl restart stackhand               # restart service
```

Or one command: `npm run update` (does all of the above)

---

## Database Management

### Reset / Clean

```bash
# Clean development database (fresh start)
npm run db:reset          # choose "development"

# Clean production database
npm run db:reset          # choose "production"

# Clean both
npm run db:reset          # choose "all"
```

### Manual reset commands

```bash
# Development
rm -f workspaces-data/dev.db
DATABASE_URL="file:./workspaces-data/dev.db" npx prisma db push --accept-data-loss
DATABASE_URL="file:./workspaces-data/dev.db" npm run db:seed

# Production
sudo systemctl stop stackhand
rm -f ~/.local/share/stackhand/workspaces-data/stackhand.db
npx prisma migrate deploy
npm run db:seed
sudo systemctl start stackhand
```

### Browse database

```bash
npm run db:studio
```

---

## Container Scoping

Containers are now scoped per workspace. When viewing containers in a workspace, only containers belonging to that workspace's stacks are shown. Switching workspaces filters the container list accordingly.

---

## Quick Reference

| Command | Description |
|---|---|
| `npm run dev` | Development mode (hot-reload) |
| `npm run build` | Build for production |
| `npm run start` | Start production (manual) |
| `npm run stop` | Stop production |
| `npm run setup` | First-time full setup |
| `npm run update` | Build + migrate + restart |
| `npm run db:seed` | Seed database |
| `npm run db:reset` | Reset database (prompts for which) |
| `npm run db:studio` | Prisma Studio (GUI) |
| `sudo systemctl start/stop/restart stackhand` | Service management |
| `sudo journalctl -u stackhand -f` | View logs |
