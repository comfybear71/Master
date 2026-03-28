# Session Log: 2026-03-29 — OAuth URL Auto-Capture for iPad

**Duration:** ~4 hours (12:30 AM — 4:22 AM AEST)
**Task:** Fix the terminal page so that Claude Code's OAuth login URL automatically appears in a clickable input box on the MasterHQ terminal page. iPad users cannot copy multi-line URLs from ttyd.

---

## The Problem

When Claude Code starts on the dev droplet and needs OAuth, it displays a 300+ character URL that wraps across 3-4 terminal lines. On iPad:
- Cannot select multi-line text in ttyd iframe
- Pressing "c" to copy (OSC 52) only copies the first visual line
- Long-press paste doesn't work in cross-origin iframes
- The URL is physically impossible to get from the terminal to a browser

## Timeline of Approaches

### Attempt 1: Monitoring WebSocket + tmux capture-pane
- Opened a second WebSocket to ttyd from the browser
- Ran `tmux capture-pane` in the hidden session
- **Failed:** User doesn't use tmux. Without tmux, one shell can't read another's output.
- Also tried `-J` flag for joining wrapped lines, scanning all tmux panes — still failed because no tmux was running.

### Attempt 2: Clipboard API / Paste Button
- Added a "Paste" button that reads `navigator.clipboard.readText()`
- User presses "c" in Claude Code, then taps Paste
- **Failed:** OSC 52 on iPad Safari truncates to first visual line. Clipboard read sometimes returned nothing.
- **Found bug:** Deployed code had `text.replace("https://claude.com/", "https://claude.ai/")` — was actively changing the URL domain!

### Attempt 3: Embedded xterm.js (replacing iframe)
- Replaced the ttyd iframe with embedded xterm.js terminal
- Connected directly to ttyd WebSocket — same origin, full output access
- **Failed:** ttyd requires an auth token (embedded in its HTML page). Without it, the WebSocket connects but ttyd waits for auth. Any input causes disconnect.
- Terminal appeared connected (green dot) but blank. First keystroke → disconnected.

### Attempt 4: Server-side WebSocket from Vercel API
- Created `/api/terminal/get-url` that connects to ttyd WebSocket from Vercel's serverless function
- Extracted auth token from ttyd HTML page server-side
- **Failed:** Firewall/network blocked Vercel → droplet WebSocket connection. Always timed out.

### Attempt 5: Background watcher with `script` + API relay (SUCCEEDED after 7 sub-iterations)
- Wrapper function: `script -qfc "command claude" /tmp/claude_out.log`
- Background watcher extracts URL from log, POSTs to MasterHQ API
- Terminal page polls API, auto-populates input bar

**Sub-iterations:**
1. **`tr -d '[:cntrl:]'` + `grep -P`** — `grep -P` not available on droplet
2. **`tr -d '[:cntrl:]'` + `grep -o`** — stripped ESC byte but left `[39m` text in URL. HTTP 500.
3. **`perl -pe 's/\e\[...//'`** — JS template literal consumed `\e`. Wouldn't even build.
4. **`col -b`** — might not be available everywhere
5. **Replaced ANSI with spaces** — inserted spaces at line wrap points, truncating URL mid-word
6. **Python `re.sub` with `\x1b`** — JS consumed `\x1b` as ESC byte, also consumed `\.` and `\?` turning them into regex wildcards. URL matched as just `authorize` without query params.
7. **Python with `chr(27)`, `chr(13)`, `chr(10)`, `[.]`, `[?]`** — WORKED! No JS escaping issues.

**Additional bugs fixed along the way:**
- JSON construction: bash `!` in password (`Smf29July1971!`) broke shell escaping. Fixed with `python3 json.dumps()`.
- `\r\n` at PTY line wraps: kernel inserts CRLF at terminal width boundary. `chr(13)/chr(10)` removal fixed it.
- Trailing "Pastecodehereifprompted": `re.sub('Paste.*', '', url)` strips it.
- `read -rp` in `curl | bash`: stdin is the pipe, not terminal. Fixed with `< /dev/tty`.
- Polling stopped on first URL: old truncated URL cached, blocked new URL. Fixed by continuing to poll.

## What Was Built

### New Files
- `app/api/terminal/oauth-url/route.ts` — POST/GET/DELETE for OAuth URL storage (MongoDB)
- `app/api/terminal/setup/route.ts` — Serves droplet install script
- `app/api/terminal/get-url/route.ts` — Server-side WebSocket reader (backup, unreliable)
- `app/api/terminal/token/route.ts` — Auth token extractor (for xterm.js, unused)
- `scripts/send-url` — Manual helper script for droplet (superseded by auto-watcher)
- `docs/oauth-url-auto-capture.md` — Full technical deep dive

### Modified Files
- `app/terminal/page.tsx` — Added OAuth URL bar with polling + Go button
- `app/globals.css` — Added xterm.js CSS import (later reverted to iframe approach)
- `CLAUDE.md` — Added Terminal OAuth URL Auto-Capture section
- `HANDOFF.md` — Added session log + failed approaches + updated iPad workflow

### Dependencies Added
- `@xterm/xterm` + `@xterm/addon-fit` (installed for attempt 3, kept in package.json)
- `ws` + `@types/ws` (for server-side WebSocket in attempt 4)

## Key Learnings

1. **Cross-origin iframes are a hard barrier.** You cannot read terminal output from a cross-origin ttyd iframe. Period.
2. **ttyd auth tokens are required.** Direct WebSocket connections without the auth token from the HTML page will fail silently.
3. **JS template literals eat backslashes.** NEVER use `\.`, `\?`, `\x1b`, `\r`, `\n` in template literal strings containing shell/Python code. Use `[.]`, `[?]`, `chr(27)`, `chr(13)`, `chr(10)`.
4. **PTY line wraps insert `\r\n`.** The kernel's PTY driver inserts CRLF at terminal width boundaries. These appear in `script` logs and break URL matching.
5. **ANSI codes appear mid-URL.** Claude Code outputs color codes between URL characters. Simple `tr` can't strip them — need regex that matches the full `ESC[...letter` pattern.
6. **Python is the universal escaping solution.** When shell tools fail due to escaping conflicts across multiple layers, Python handles everything cleanly.
7. **Push, don't pull.** Having the droplet push data to the Vercel API is reliable. Having Vercel pull from the droplet (WebSocket, SSH) fails due to firewalls.

## Final Architecture
```
Droplet: claude wrapper → script log → Python watcher → curl POST to API
Vercel:  MongoDB stores URL → terminal page polls GET → auto-shows in bar
iPad:    User sees URL → taps Go → authorizes → pastes code back
```

## Commits (14 total on claude/auto-copy-oauth-url-Gt5oK)
1. Auto-detect OAuth URL from Claude Code terminal output
2. Fix OAuth URL detection: join wrapped lines + add API relay for iPad
3. Add clipboard Paste button + API relay for OAuth URL on iPad
4. Replace iframe with embedded xterm.js
5. Revert to iframe terminal + add Get Login URL button
6. Add droplet setup script + simplified Get Login URL
7. Fix: droplet pushes OAuth URL to MasterHQ API instead of pull
8. Fix setup: read password from /dev/tty + fix grep for script logs
9. Fix watcher: use tr+grep -o (no -P needed) + add debug logging
10. Fix build: use tr -d [:cntrl:] (POSIX, no JS escape issues)
11. Fix ANSI stripping: use perl then Python
12. Fix URL regex: use [.] and [?] to avoid JS backslash consumption
13. Fix URL truncation: strip CR/LF at PTY line wraps using chr()
14. Fix polling: keep updating URL even when old one is cached
