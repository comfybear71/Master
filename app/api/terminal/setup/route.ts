import { NextResponse } from "next/server";

// Serves a shell script that sets up OAuth URL auto-capture on the droplet
// Usage: curl -sL https://masterhq.dev/api/terminal/setup | bash
export async function GET() {
  const script = `#!/bin/bash
# MasterHQ Terminal — OAuth URL Auto-Capture Setup
# Run once on the droplet: curl -sL https://masterhq.dev/api/terminal/setup | bash

echo "Setting up OAuth URL auto-capture..."

# 1. Add claude wrapper function to ~/.bashrc
if grep -q "# masterhq-oauth-capture" ~/.bashrc 2>/dev/null; then
  echo "Already installed. Updating..."
  sed -i '/# masterhq-oauth-capture START/,/# masterhq-oauth-capture END/d' ~/.bashrc
fi

cat >> ~/.bashrc << 'WRAPPER'
# masterhq-oauth-capture START
claude() {
    rm -f ~/.claude_oauth_url /tmp/claude_out.log
    touch /tmp/claude_out.log
    # Background watcher: extracts OAuth URL from script log
    (
        for _ in $(seq 1 120); do
            sleep 2
            URL=$(sed 's/\\x1b\\[[0-9;]*[a-zA-Z]//g' /tmp/claude_out.log 2>/dev/null | tr -d '\\r\\n' | grep -oE 'https://claude\\.com/cai/oauth/authorize\\?[^ ]+' | head -1)
            if [ -n "$URL" ]; then
                echo "$URL" > ~/.claude_oauth_url
                break
            fi
        done
    ) &
    local WATCHER_PID=$!
    # script preserves the TTY while logging all output
    script -qfc "command claude $*" /tmp/claude_out.log
    local EXIT_CODE=$?
    kill $WATCHER_PID 2>/dev/null
    wait $WATCHER_PID 2>/dev/null
    return $EXIT_CODE
}
# masterhq-oauth-capture END
WRAPPER

# 2. Add nginx endpoint to serve the file (if nginx is installed)
if command -v nginx &>/dev/null && [ -d /etc/nginx ]; then
  # Check if the location already exists
  if ! grep -q "oauth-url" /etc/nginx/sites-enabled/default 2>/dev/null && \
     ! grep -q "oauth-url" /etc/nginx/conf.d/*.conf 2>/dev/null; then
    echo "Adding nginx /oauth-url endpoint..."
    # Find the server block and add the location
    sudo sed -i '/server_name.*terminal/,/^}/ {
      /^}/i\\
    location = /oauth-url {\\
        default_type text/plain;\\
        alias /home/'"$USER"'/.claude_oauth_url;\\
        add_header Access-Control-Allow-Origin *;\\
        add_header Cache-Control no-cache;\\
    }
    }' /etc/nginx/sites-enabled/default 2>/dev/null || \
    sudo sed -i '/server_name.*terminal/,/^}/ {
      /^}/i\\
    location = /oauth-url {\\
        default_type text/plain;\\
        alias /home/'"$USER"'/.claude_oauth_url;\\
        add_header Access-Control-Allow-Origin *;\\
        add_header Cache-Control no-cache;\\
    }
    }' /etc/nginx/conf.d/terminal.conf 2>/dev/null || true
    sudo nginx -t 2>/dev/null && sudo nginx -s reload 2>/dev/null
  fi
fi

echo ""
echo "Done! Now run: source ~/.bashrc"
echo ""
echo "Usage:"
echo "  1. Type 'claude' in the terminal"
echo "  2. Wait for the OAuth URL to appear"
echo "  3. Tap 'Get Login URL' on the MasterHQ terminal page"
echo "  4. Tap 'Go' to open the login page"
`;

  return new NextResponse(script, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
