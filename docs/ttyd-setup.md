# ttyd Setup — Browser Terminal on DigitalOcean Droplet

> **NOTE: This guide is for the BUDJU trading bot droplet.**
> For the Claude Code dev droplet (masterhq-dev-syd1), see **DEV-DROPLET-SETUP.md** instead.
> The Terminal page on masterhq.dev should point to the DEV droplet, NOT this one.

## Overview

ttyd is a lightweight tool that shares a terminal over the browser. It runs on your DigitalOcean droplet and serves a full terminal at `http://DROPLET_IP:7681`. MasterHQ embeds this in an iframe at `/terminal`.

**Primary use case:** SSH into your droplet from your iPad when away from your PC.

---

## Step 1: Install ttyd

```bash
ssh budju@YOUR_DROPLET_IP

sudo apt update && sudo apt install -y ttyd
```

## Step 2: Test it works

```bash
ttyd -p 7681 bash
```

Visit `http://YOUR_DROPLET_IP:7681` in your browser to confirm you see a terminal. Press `Ctrl+C` to stop the test.

## Step 3: Create systemd service

```bash
sudo nano /etc/systemd/system/ttyd.service
```

Paste this:

```ini
[Unit]
Description=ttyd Web Terminal
After=network.target

[Service]
Type=simple
User=budju
ExecStart=/usr/bin/ttyd -p 7681 -t fontSize=16 bash
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

## Step 4: Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable ttyd
sudo systemctl start ttyd
```

## Step 5: Open firewall

```bash
sudo ufw allow 7681/tcp
# If using SSL (recommended), also open port 443:
sudo ufw allow 443/tcp
```

## Step 6: Add to Vercel

Go to Vercel → master project → Settings → Environment Variables and add:

```
TTYD_URL = http://YOUR_DROPLET_IP:7681
TERMINAL_PASSWORD = choose_a_strong_password
```

Then visit `https://masterhq.dev/terminal` and enter the password.

---

## Install tmux (RECOMMENDED)

tmux keeps your terminal sessions alive even when your iPad browser closes or goes to sleep. This is a game changer for iPad use.

```bash
sudo apt install -y tmux
```

### How to use tmux

Start a new named session:
```bash
tmux new -s work
```

Detach from session (it keeps running in the background):
Press `Ctrl+B`, then `D`

Reattach to session:
```bash
tmux attach -t work
```

List sessions:
```bash
tmux ls
```

**With tmux, even if your iPad screen locks or Safari closes, your session keeps running on the droplet. Just reopen masterhq.dev/terminal and run `tmux attach -t work`.**

---

## Installing Claude Code on the Droplet

```bash
# Install Claude Code (Linux native installer)
curl -fsSL https://claude.ai/install.sh | bash

# Reload your shell so the claude command is available
source ~/.bashrc

# Verify it installed
claude --version

# Authenticate with your Anthropic account
claude
# This will open an auth URL — copy it, open it in your iPad browser,
# sign in with your Anthropic account, then come back to the terminal
```

### Tips for using Claude Code via iPad + ttyd

- Use **landscape mode** on iPad for more screen space
- Claude Code approval prompts use `y/n` — easy to type on iPad keyboard
- **Always use tmux** before starting Claude Code:

```bash
tmux new -s claude
cd ~/budju-xyz
claude
```

To reattach later:
```bash
tmux attach -t claude
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't connect | Check `sudo systemctl status ttyd` — is it running? |
| Connection refused | Check `sudo ufw status` — is port 7681 open? |
| iframe blocked | ttyd may need HTTPS. Consider adding Caddy reverse proxy with SSL. |
| Session dies on iPad sleep | Use tmux — sessions persist in background |
| Slow/laggy | Normal over network. Keep commands short. |
