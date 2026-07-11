# Stackhand Installation Guide

## Prerequisites

- **Node.js** 20+ (recommended: 22+) with nvm
- **npm** 10+
- **Docker Engine** running (for container/stack features)
- **Ollama** running (optional, for AI features)

---

## Quick Install

```bash
# 1. Clone
git clone <repo-url> ~/Workspace/stackhand
cd ~/Workspace/stackhand

# 2. Setup environment (prompts for token, paths, etc.)
bash scripts/env-setup.sh

# 3. Full setup — install deps, build, migrate, seed
npm run setup

# 4. Install systemd service (auto-starts on boot)
sudo bash scripts/install-service.sh

# 5. Start production
sudo systemctl start stackhand
```

Your app is now running at **http://localhost:22443** (backend) and **http://localhost:22080** (frontend).

---

## Everyday Commands

| What | Command |
|---|---|
| Start both servers | `sudo systemctl start stackhand` |
| Stop both servers | `sudo systemctl stop stackhand` |
| View logs | `sudo journalctl -u stackhand -f` |
| Update after code changes | `npm run update` |
| Development mode | `npm run dev` |

---

## Uninstall

```bash
sudo bash scripts/uninstall.sh
```

Or manually:

```bash
sudo systemctl stop stackhand
sudo systemctl disable stackhand
sudo rm /etc/systemd/system/stackhand.service
sudo systemctl daemon-reload
rm -rf ~/.local/share/stackhand
rm -rf ~/Workspace/stackhand
```

---

## Data Directories

| Path | Contents |
|---|---|
| `~/.local/share/stackhand/workspaces-data/` | Production SQLite database |
| `~/.local/share/stackhand/workspaces/` | Stack files |
| `~/Workspace/stackhand/workspaces-data/` | Dev database |
