import { NextResponse } from "next/server";

// Serves a shell script that sets up OAuth URL auto-capture on the droplet
// Usage: curl -sL https://masterhq.dev/api/terminal/setup | bash
export async function GET() {
  const script = `#!/bin/bash
# MasterHQ Terminal — OAuth URL Auto-Capture Setup
# Run once: curl -sL https://masterhq.dev/api/terminal/setup | bash

echo ""
echo "=== MasterHQ OAuth URL Auto-Capture ==="
echo ""

# Get terminal password — read from /dev/tty because stdin is the pipe
if [ -z "$TERMINAL_PASSWORD" ]; then
  read -rp "Enter your MasterHQ terminal password: " TERMINAL_PASSWORD < /dev/tty
  echo ""
fi

if [ -z "$TERMINAL_PASSWORD" ]; then
  echo "Error: password is required."
  exit 1
fi

# Remove old version
sed -i '/# masterhq-oauth-capture START/,/# masterhq-oauth-capture END/d' ~/.bashrc 2>/dev/null
sed -i "/export TERMINAL_PASSWORD=/d" ~/.bashrc 2>/dev/null

# Store password
echo "export TERMINAL_PASSWORD='$TERMINAL_PASSWORD'" >> ~/.bashrc

# Install the claude wrapper
cat >> ~/.bashrc << 'WRAPPER'
# masterhq-oauth-capture START
claude() {
    rm -f ~/.claude_oauth_url /tmp/claude_out.log /tmp/claude_oauth_debug.log
    touch /tmp/claude_out.log
    echo "[watcher] Starting..." > /tmp/claude_oauth_debug.log
    # Background watcher: finds URL and pushes to MasterHQ
    (
        for i in $(seq 1 120); do
            sleep 2
            # Strip ALL control chars (0x00-0x1F) then grep for URL
            # Uses basic grep -o (no -P needed) which is always available
            URL=$(tr -d '\000-\037' < /tmp/claude_out.log 2>/dev/null | grep -o 'https://claude\.com/cai/oauth[^ ]*' | head -1)
            echo "[watcher] Check $i: found='$URL'" >> /tmp/claude_oauth_debug.log
            if [ -n "$URL" ]; then
                echo "$URL" > ~/.claude_oauth_url
                echo "[watcher] URL saved to ~/.claude_oauth_url" >> /tmp/claude_oauth_debug.log
                # Push to MasterHQ API
                HTTP_CODE=$(curl -s -o /tmp/claude_oauth_response.log -w '%{http_code}' \
                    -X POST "https://masterhq.dev/api/terminal/oauth-url" \
                    -H 'Content-Type: application/json' \
                    -d "{\"url\":\"$URL\",\"password\":\"$TERMINAL_PASSWORD\"}")
                echo "[watcher] POST response: HTTP $HTTP_CODE" >> /tmp/claude_oauth_debug.log
                cat /tmp/claude_oauth_response.log >> /tmp/claude_oauth_debug.log 2>/dev/null
                echo "" >> /tmp/claude_oauth_debug.log
                break
            fi
        done
        echo "[watcher] Done." >> /tmp/claude_oauth_debug.log
    ) &
    # script preserves TTY while logging output
    script -qfc "command claude $*" /tmp/claude_out.log
}
# masterhq-oauth-capture END
WRAPPER

echo "Done! Now run:  source ~/.bashrc"
echo ""
echo "Then type 'claude'. The login URL will appear"
echo "automatically in the terminal page."
echo "(Debug log: cat /tmp/claude_oauth_debug.log)"
echo ""
`;

  return new NextResponse(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
