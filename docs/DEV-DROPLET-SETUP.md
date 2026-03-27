# Dev Droplet Setup — Claude Code from iPad

> **This guide is for the NEW Claude Code dev droplet (masterhq-dev-syd1).**
> For the budju trading bot droplet, see ttyd-setup.md instead.

## Overview

A dedicated DigitalOcean droplet for running Claude Code sessions from your iPad via masterhq.dev/terminal. Completely separate from the budju trading bot droplet.

| Droplet | Monthly | Purpose |
|---------|---------|---------|
| budju-syd1 (existing) | ~$4/mo | Solana trading bot ONLY — do not touch |
| masterhq-dev-syd1 (new) | $12/mo | Claude Code sessions from iPad |
| **Total** | **~$16/mo** | |

---

## Step 1: Create the Droplet

Go to DigitalOcean dashboard → Create → Droplets:
- **Image:** Ubuntu 24.04 LTS
- **Plan:** Basic, Regular SSD, $12/mo (1 vCPU, 2GB RAM, 50GB SSD)
- **Region:** Sydney (syd1)
- **Authentication:** Password (set a strong root password)
- **Hostname:** masterhq-dev-syd1

Click Create Droplet. Wait for the IP address.

---

## Step 2: Initial Server Setup

```bash
ssh root@YOUR_NEW_DROPLET_IP

# Create non-root user
adduser stuart
usermod -aG sudo stuart

# Set up firewall
ufw allow OpenSSH
ufw allow 7681/tcp
ufw enable

# Switch to new user
su - stuart
```

---

## Step 3: Install Essentials

```bash
sudo apt update && sudo apt install -y git curl tmux nano htop
```

---

## Step 4: Install Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
source ~/.bashrc
claude --version
```

---

## Step 5: Authenticate Claude Code

```bash
claude
# Claude will give you a URL — copy it and open in your iPad browser
# Sign in with your Anthropic account
# Come back to terminal — you are now authenticated
```

---

## Step 6: Install ttyd

```bash
sudo apt install -y ttyd
```

---

## Step 7: Create ttyd Systemd Service

```bash
sudo nano /etc/systemd/system/ttyd.service
```

Paste this exactly:

```ini
[Unit]
Description=ttyd Web Terminal
After=network.target

[Service]
Type=simple
User=stuart
ExecStart=/usr/bin/ttyd -p 7681 -t fontSize=16 bash
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save and exit (Ctrl+X, Y, Enter).

```bash
sudo systemctl daemon-reload
sudo systemctl enable ttyd
sudo systemctl start ttyd
sudo systemctl status ttyd
```

---

## Step 8: Test ttyd

Open `http://YOUR_NEW_DROPLET_IP:7681` in your browser — you should see a terminal.

---

## Step 9: Update MasterHQ Env Vars in Vercel

Go to Vercel → MasterHQ project → Settings → Environment Variables:

```
TTYD_URL = http://YOUR_NEW_DROPLET_IP:7681
```

(`TERMINAL_PASSWORD` stays the same as what you already set.)

**Redeploy MasterHQ after updating the env var.**

---

## Step 10: Test from iPad

1. Open `masterhq.dev/terminal` on your iPad
2. Enter your TERMINAL_PASSWORD
3. You should be in a bash shell on the new dev droplet

---

## Step 11: tmux Workflow (ALWAYS use this on iPad)

```bash
# Start a new named session
tmux new -s claude

# Start Claude Code
cd ~
claude

# If iPad sleeps or browser closes:
# Reopen masterhq.dev/terminal and run:
tmux attach -t claude
# You're right back where you left off
```

---

## Useful tmux Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` then `D` | Detach from session (keeps it running) |
| `tmux ls` | List all sessions |
| `tmux kill-session -t claude` | Kill a session |
| `Ctrl+B` then `C` | New window inside tmux |
| `Ctrl+B` then `0-9` | Switch to window by number |
| `Ctrl+B` then `N` | Next window |
| `Ctrl+B` then `P` | Previous window |

---

## Working on Projects

```bash
# Clone a repo
cd ~
git clone https://github.com/comfybear71/aiglitch.git
cd aiglitch

# Start Claude Code in the project
tmux new -s aiglitch
claude

# For MasterHQ
cd ~
git clone https://github.com/comfybear71/Master.git
cd Master
tmux new -s master
claude
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect to droplet | Check IP address, firewall: `sudo ufw status` |
| ttyd not running | `sudo systemctl restart ttyd` then check `sudo systemctl status ttyd` |
| Claude Code auth expired | Run `claude` again — it will re-authenticate |
| tmux session lost | `tmux ls` to check — if empty, session was killed (reboot?) |
| Out of memory | Check with `htop` — 2GB should be enough for Claude Code |
| iframe blocked on masterhq.dev | Fixed — see SSL Setup section below |

---

## SSL Setup (nginx + Let's Encrypt)

### Why SSL is needed

MasterHQ is served over HTTPS (`https://masterhq.dev`). Browsers block HTTPS pages from loading HTTP iframes (mixed content). Without SSL on ttyd, the terminal iframe won't load.

**Solution:** nginx reverse proxy with Let's Encrypt SSL on `terminal.masterhq.dev`.

### DNS Record

Add an A record in your domain registrar:
```
Name: terminal
Value: 170.64.133.9 (dev droplet IP)
TTL: 3600
```

### Install nginx + certbot

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
```

### nginx Config

```bash
sudo nano /etc/nginx/sites-available/terminal.masterhq.dev
```

```nginx
server {
    listen 80;
    server_name terminal.masterhq.dev;

    location / {
        proxy_pass http://localhost:7681;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/terminal.masterhq.dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo ufw allow 80/tcp
```

### Get SSL Certificate

```bash
sudo certbot --nginx -d terminal.masterhq.dev
```

Certbot automatically:
- Gets the SSL certificate from Let's Encrypt
- Configures nginx to use HTTPS
- Redirects HTTP to HTTPS
- Sets up auto-renewal (every 90 days via cron)

### Update Vercel

Update `TTYD_URL` in Vercel environment variables:
```
TTYD_URL = https://terminal.masterhq.dev
```

Redeploy MasterHQ after updating.

### Verify

Visit `https://terminal.masterhq.dev` — you should see the ttyd terminal over HTTPS.
Then visit `https://masterhq.dev/terminal` — the iframe should load without mixed content errors.
