# Workflow Guide

## Development Mode

```bash
npm run dev
```

Starts both servers with hot-reload:
- Backend: `http://localhost:4000` (auto-restarts on changes)
- Frontend: `http://localhost:22080` (instant browser updates)
- Database: `workspaces-data/dev.db` (separate from production)

---

## Production Mode

### Start (both servers)

```bash
# Via systemd (recommended — runs on boot)
sudo systemctl start stackhand

# Or manually
npm run start
```

- Backend API: `http://localhost:22443`
- Frontend UI: `http://localhost:22443` (served by backend)
- Or standalone frontend: `http://localhost:22080`

### Stop

```bash
sudo systemctl stop stackhand
```

### Logs

```bash
sudo journalctl -u stackhand -f
```

---

## Update After Code Changes

```bash
npm run update
```

This runs: `build → prisma generate → prisma migrate deploy → restart service`

---

## Database Changes

1. Edit `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name description`
3. Apply to production: `npm run db:migrate:prod`
4. Seed: `npm run db:seed`

Browse database: `npm run db:studio`

---

## Full Setup (Fresh System)

```bash
bash scripts/env-setup.sh     # Configure .env
npm run setup                  # Install deps, build, migrate, seed
sudo bash scripts/install-service.sh  # Install systemd service
sudo systemctl start stackhand # Start everything
```

---

## Uninstall

```bash
sudo bash scripts/uninstall.sh
```

---

## Quick Reference

| Command | Description |
|---|---|
| `npm run dev` | Development mode (hot-reload) |
| `npm run build` | Build for production |
| `npm run start` | Start production (manual) |
| `npm run stop` | Stop production (manual) |
| `npm run setup` | First-time full setup |
| `npm run update` | Build + migrate + restart |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Prisma Studio (GUI) |
| `sudo systemctl start\|stop\|restart stackhand` | Service management |
| `sudo journalctl -u stackhand -f` | View logs |
