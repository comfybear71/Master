# OAuth URL Auto-Capture — Technical Deep Dive

> How the MasterHQ terminal page automatically captures Claude Code's OAuth login URL on iPad, where manual copy-paste is impossible.

**Status:** WORKING (2026-03-29)
**Problem solved:** iPad Safari cannot copy multi-line text from ttyd terminal iframe. Claude Code's OAuth URL is 300+ characters and wraps across 3-4 terminal lines.

---

## The Problem

When starting Claude Code on a headless server via ttyd (browser terminal), it requires OAuth login. The flow is:
1. Claude Code prints a long OAuth URL (300+ chars)
2. User must open that URL in a browser
3. User authorizes, gets an auth code
4. User pastes the code back into the terminal

On desktop, this is trivial — copy the URL, paste in browser. On iPad:
- The ttyd terminal runs in a **cross-origin iframe** (`terminal.masterhq.dev` inside `masterhq.dev`)
- iPad Safari **cannot select multi-line text** in ttyd
- The URL wraps across **3-4 lines** due to terminal width
- Pressing "c" in Claude Code (OSC 52 clipboard) only copies the **first visual line**
- Long-press paste doesn't work inside the cross-origin iframe

**Result:** It was physically impossible to get the full URL from the terminal to the browser on iPad.

---

## Approaches Tried (and Why They Failed)

### 1. Monitoring WebSocket (FAILED)
**Idea:** Open a second WebSocket to ttyd from the browser, create a hidden shell session, run `tmux capture-pane` to read the main terminal's output.

**Why it failed:**
- The user doesn't use tmux — they run `claude` directly
- Without tmux, there's no way for one shell to read another shell's output
- Even with tmux, the `-J` flag (join wrapped lines) was needed but the session name was unpredictable
- The WebSocket monitoring DID connect but the `tmux capture-pane` commands returned nothing

### 2. Embedded xterm.js (FAILED)
**Idea:** Replace the ttyd iframe with embedded xterm.js connecting directly to the ttyd WebSocket. Same origin = direct access to all terminal output.

**Why it failed:**
- ttyd requires **authentication** via an auth token embedded in its HTML page
- The xterm.js WebSocket connected but ttyd waited for the auth token
- Without auth, sending any data (resize, keystrokes) caused ttyd to close the connection
- The terminal appeared connected (green dot) but was blank — no shell prompt
- As soon as the user typed, it disconnected

### 3. Clipboard API / Paste Button (FAILED)
**Idea:** User presses "c" in Claude Code (copies via OSC 52), then taps a Paste button on the parent page that reads `navigator.clipboard.readText()`.

**Why it failed:**
- OSC 52 clipboard on iPad Safari is unreliable — sometimes copies nothing, sometimes only the first visual line
- `navigator.clipboard.readText()` requires user gesture AND clipboard permission
- Even when clipboard had data, it was truncated (first line only)
- The deployed code had a bug: `text.replace("https://claude.com/", "https://claude.ai/")` which actively broke the URL domain

### 4. Server-side WebSocket from Vercel (FAILED)
**Idea:** Create an API route on Vercel that connects to ttyd's WebSocket server-side, runs `cat ~/.claude_oauth_url`, returns the result.

**Why it failed:**
- Vercel serverless functions couldn't reach the droplet's WebSocket (firewall/network)
- Even with auth token extraction from ttyd's HTML page, the connection timed out
- The "Get Login URL" button called this API but always got empty results

### 5. Shell `tee` pipe (NOT USED)
**Idea:** `claude "$@" | tee >(grep ... > ~/.claude_oauth_url)`

**Why it wasn't used:**
- Piping Claude Code through `tee` changes stdout from a terminal to a pipe
- Claude Code detects `isatty(stdout)` and disables its TUI mode
- The interactive terminal experience would be completely broken

### 6. Background watcher with `script` + API relay (SUCCEEDED)
**Idea:** Wrap the `claude` command in `script` (preserves TTY while logging output), run a background watcher that extracts the URL from the log, POST it to MasterHQ API, terminal page polls and displays it.

**This is what finally worked.** See architecture below.

---

## Working Architecture

```
iPad Browser (masterhq.dev/terminal)
    │
    ├── ttyd iframe (terminal.masterhq.dev)
    │     └── User types: claude
    │           └── Wrapper function starts:
    │                 ├── Background watcher (subshell)
    │                 └── script -qfc "command claude" /tmp/claude_out.log
    │
    ├── OAuth URL bar (polls /api/terminal/oauth-url every 3s)
    │     └── When URL appears → yellow bar with "Go" button
    │
    └── User taps Go → opens OAuth page in new tab
          └── Authorizes → gets code → pastes back into terminal
```

### Droplet Side (`~/.bashrc` wrapper)

```bash
claude() {
    rm -f ~/.claude_oauth_url /tmp/claude_out.log /tmp/claude_oauth_debug.log
    touch /tmp/claude_out.log
    # Background watcher
    (
        for i in $(seq 1 120); do
            sleep 2
            # Python: strip ANSI, strip CR/LF, grep URL, strip trailing junk
            URL=$(python3 -c "..." 2>/dev/null)
            if [ -n "$URL" ]; then
                echo "$URL" > ~/.claude_oauth_url
                # Python: json.dumps() for safe encoding, curl POST
                python3 -c "..." "$URL" "$TERMINAL_PASSWORD" | curl ...
                break
            fi
        done
    ) &
    # script preserves TTY while logging all output
    script -qfc "command claude $*" /tmp/claude_out.log
}
```

### Python URL Extraction (the hard part)

The `script` log contains raw terminal output with:
- ANSI escape codes (`\e[39m`, `\e[38;5;246m`) for colors
- Cursor movement sequences (`\e[1C`) between words
- `\r\n` at PTY line wrap points (inserted by kernel, not application)
- The URL text interspersed with all of the above

```python
import re
data = open('/tmp/claude_out.log', 'rb').read().decode('utf-8', errors='ignore')
# 1. Strip ANSI escape sequences (keeps URL contiguous)
clean = re.sub(chr(27) + r'[[0-9;?]*[a-zA-Z]', '', data)
# 2. Strip CR/LF (removes PTY line wraps that break the URL)
clean = clean.replace(chr(13), '').replace(chr(10), '')
# 3. Match the OAuth URL (character class of valid URL chars only)
m = re.search(r'https://claude[.]com/cai/oauth/authorize[?][a-zA-Z0-9%_.=&+~:/?-]+', clean)
if m:
    url = m.group()
    # 4. Strip trailing "Pastecodehereifprompted" (concatenated after newline removal)
    url = re.sub('Paste.*', '', url)
    print(url)
```

### Why Python instead of shell tools?

Every shell approach had escaping issues:

| Tool | Problem |
|------|---------|
| `tr -d '[:cntrl:]'` | Strips ESC byte but leaves `[39m` as text in the URL |
| `sed 's/\x1b\[...//'` | `\x1b` not supported by all sed versions |
| `grep -P` (Perl regex) | Not available on all systems (requires PCRE) |
| `perl -pe 's/\e\[...//'` | JS template literal consumes `\e` as escape |
| Shell variable in JSON | `!` in password triggers bash history expansion in some contexts |

Python handles all of these correctly with no escaping issues.

### JSON Encoding

The URL and password are passed to `python3 json.dumps()` for safe JSON construction:

```python
import json, sys
print(json.dumps({'url': sys.argv[1], 'password': sys.argv[2]}))
```

This handles:
- `!` in password (bash history expansion issue)
- `'` single quotes in URL (broke shell quoting)
- `%`, `&`, `=` and other URL characters
- Any special characters that would break manual JSON construction

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/terminal/oauth-url` | POST | Store URL (called from droplet watcher) |
| `/api/terminal/oauth-url` | GET | Retrieve URL (polled by terminal page) |
| `/api/terminal/oauth-url` | DELETE | Clear stored URL |
| `/api/terminal/setup` | GET | Serves the install script for the droplet |
| `/api/terminal/get-url` | POST | Server-side WebSocket reader (backup, unreliable) |
| `/api/terminal/token` | POST | Extract ttyd auth token (for xterm.js, unused) |

URLs are stored in MongoDB `settings` collection with key `terminal_oauth_url` and a 10-minute TTL.

---

## JS Template Literal Escaping Hell

The setup script is a shell script served from a Next.js API route as a JavaScript template literal. This creates THREE escaping layers:

1. **JavaScript template literal** — processes `\n`, `\t`, `\x1b`, `\.`, `\?`, etc.
2. **Bash heredoc** (`<< 'WRAPPER'`) — writes content literally to `.bashrc`
3. **Python source code** — interprets its own escape sequences

### Escaping bugs encountered:

| Bug | Cause | Fix |
|-----|-------|-----|
| `\000-\037` in `tr` | JS strict mode: legacy octal escapes forbidden | Used `[:cntrl:]` character class instead |
| `\.` in Python regex | JS consumed `\` → regex got `.` (any char) | Used `[.]` character class |
| `\?` in Python regex | JS consumed `\` → regex got `?` (quantifier) | Used `[?]` character class |
| `\x1b` in Python regex | JS converted to actual ESC byte (0x1B) | Used `chr(27)` in Python instead |
| `\r\n` in Python string | JS converted to actual CR/LF bytes, broke multi-line `-c` arg | Used `chr(13)`, `chr(10)` |
| `\e` in Perl regex | JS strict mode: unrecognized escape | Switched to Python entirely |

**Rule:** When embedding code in JS template literals, avoid ALL backslash escapes. Use character classes (`[.]`, `[?]`) and `chr()` functions instead.

---

## One-Time Setup

Run once on the droplet:
```bash
curl -sL https://masterhq.dev/api/terminal/setup | bash
# Enter terminal password when prompted
source ~/.bashrc
```

This installs:
- `claude()` wrapper function in `~/.bashrc`
- `TERMINAL_PASSWORD` export in `~/.bashrc`
- Background watcher that auto-detects OAuth URLs

---

## Debug

If the URL doesn't appear in the terminal page:

```bash
# Check the watcher debug log
cat /tmp/claude_oauth_debug.log

# Check if the URL was saved locally
cat ~/.claude_oauth_url

# Check the script log exists and has content
ls -la /tmp/claude_out.log

# Manually test the Python extraction
python3 -c "
import re
data = open('/tmp/claude_out.log', 'rb').read().decode('utf-8', errors='ignore')
clean = re.sub(chr(27) + r'[[0-9;?]*[a-zA-Z]', '', data)
clean = clean.replace(chr(13), '').replace(chr(10), '')
m = re.search(r'https://claude[.]com/cai/oauth/authorize[?][a-zA-Z0-9%_.=&+~:/?-]+', clean)
if m:
    url = m.group()
    url = re.sub('Paste.*', '', url)
    print('FOUND:', url)
else:
    print('NOT FOUND')
    print('Clean length:', len(clean))
    print('Last 200 chars:', repr(clean[-200:]))
"

# Test the API directly
curl -s -X POST https://masterhq.dev/api/terminal/oauth-url \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://claude.com/cai/oauth/authorize?test=1","password":"YOUR_PASSWORD"}'
```

---

## Known Limitations

1. **First run after setup:** The old truncated URL may be cached in MongoDB. Tap X to clear, then the new full URL appears.
2. **10-minute TTL:** Stored URLs expire after 10 minutes. If Claude Code's OAuth prompt sits too long, re-run `claude`.
3. **`script` command quirks:** The `script` wrapper slightly changes terminal behavior (e.g., exit codes, signal handling). If Claude Code behaves differently, try running it directly without the wrapper: `command claude`.
4. **Password in .bashrc:** `TERMINAL_PASSWORD` is stored in plaintext in `~/.bashrc`. The droplet should have restricted access.
