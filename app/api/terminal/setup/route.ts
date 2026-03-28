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

# Get terminal password (needed to push URL to MasterHQ)
if [ -z "$TERMINAL_PASSWORD" ]; then
  read -rp "Enter your MasterHQ terminal password: " TERMINAL_PASSWORD
  echo ""
fi

# Remove old version if exists
if grep -q "# masterhq-oauth-capture" ~/.bashrc 2>/dev/null; then
  echo "Removing old version..."
  sed -i '/# masterhq-oauth-capture START/,/# masterhq-oauth-capture END/d' ~/.bashrc
fi

# Install the claude wrapper
cat >> ~/.bashrc << 'WRAPPER'
# masterhq-oauth-capture START
claude() {
    rm -f ~/.claude_oauth_url /tmp/claude_out.log
    touch /tmp/claude_out.log
    # Background watcher: extracts OAuth URL and pushes to MasterHQ
    (
        for _ in $(seq 1 120); do
            sleep 2
            URL=$(sed 's/\\x1b\\[[0-9;]*[a-zA-Z]//g' /tmp/claude_out.log 2>/dev/null | tr -d '\\r\\n' | grep -oE 'https://claude\\.com/cai/oauth/authorize\\?[^ ]+' | head -1)
            if [ -n "$URL" ]; then
                echo "$URL" > ~/.claude_oauth_url
                # Push to MasterHQ API so the terminal page picks it up
                curl -s -X POST "https://masterhq.dev/api/terminal/oauth-url" \\
                    -H 'Content-Type: application/json' \\
                    -d "{\\"url\\":\\"$URL\\",\\"password\\":\\"$TERMINAL_PASSWORD\\"}" > /dev/null 2>&1 &
                break
            fi
        done
    ) &
    # script preserves the TTY while logging all output
    script -qfc "command claude $*" /tmp/claude_out.log
    local EXIT_CODE=$?
    return $EXIT_CODE
}
# masterhq-oauth-capture END
WRAPPER

# Store TERMINAL_PASSWORD in .bashrc if not already there
if ! grep -q "export TERMINAL_PASSWORD=" ~/.bashrc 2>/dev/null; then
  echo "export TERMINAL_PASSWORD='$TERMINAL_PASSWORD'" >> ~/.bashrc
fi

echo "Done! Now run:  source ~/.bashrc"
echo ""
echo "Then just type 'claude'. The login URL will appear"
echo "automatically in the MasterHQ terminal page."
echo ""
`;

  return new NextResponse(script, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
