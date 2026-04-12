# PR Handoff Format Prompt — Standalone Rule

> Paste this into any Claude Code session to teach it the clean PR handoff
> format. Works standalone (no need to paste the full starter prompt
> alongside) — you can drop it into an existing mid-flow session and
> Claude will pick up the new rule immediately.
>
> **Use when:** you're working on a project that doesn't yet have the
> full preservation protocol setup, or you just want to enforce the
> handoff format without the rest of the starter prompt baggage.
>
> **Last updated:** 2026-04-10

---

## Why this is a separate prompt

The full `starter-prompt.md` covers everything: sacred files, branch
protection, fix spiral prevention, trading warnings, and the PR handoff
format. It's long — by design, because it establishes the whole
preservation protocol.

This prompt is **just the handoff format rule**, extracted and standalone.
Use it when:

- You're working in a project that already has other rules set up and
  you just want to add the handoff format
- You're mid-session and want to teach Claude the format without
  restarting
- You want to give AIG!itch or another project's Claude a quick format
  rule without the full preservation protocol context
- You want to refresh Claude's memory of the format mid-session if it
  starts giving unstructured output

---

## The prompt (copy-paste this)

Copy everything between the lines below into your Claude Code session.

---

```
## New rule for how you deliver work at the end of every session

From now on, whenever you finish a task and the branch is ready, give me a
PR handoff package in this EXACT format. No variations, no extra text,
no skipping sections. I drive the merge + release via GitHub web UI on
my phone/iPad, so I need to copy-paste each block directly into GitHub
without editing anything.

### Required format (copy this structure exactly)

## Branch ready for PR

### Compare URL
https://github.com/comfybear71/<REPO>/compare/<DEFAULT-BRANCH>...<BRANCH-NAME>

(Use the actual repo name and branch — I click this link to open the PR
compose page directly, so it MUST be a real working URL.)

### PR Title
<one-line descriptive title, max 70 characters>

### PR Description (copy-paste block)
​```markdown
## Summary
<1-3 sentence overview of what changed and why>

## Changes
- <specific bullet list of what was actually modified>
- <include file names and what was changed in each>
- <be concrete, not vague>

## Test plan
- [x] Type check passes (or equivalent for this stack)
- [x] Build passes (if applicable)
- [ ] <manual verification steps I should do after deploy>
- [ ] <links to Vercel preview URL once it builds>
​```

### Merge instructions
1. Open the Compare URL above
2. Click green "Create pull request"
3. Scroll to bottom → dropdown ▼ next to "Merge pull request"
4. Select "Squash and merge" (linear history is enforced on master)
5. Click "Confirm squash and merge"
6. Click "Delete branch" after merge

### Release tag (MANDATORY)
- **Tag name:** v<semver>-<YYYY-MM-DD>  (or v<semver>-<feature-name> for major)
- **Target:** <default branch>
- **Title:** <short release title>
- **Description:** <brief summary of what's in this release>
- **Create via:** https://github.com/comfybear71/<REPO>/releases/new

### Rules about the format

1. **Every session ends with this handoff package.** No exceptions. Even
   tiny changes (typo fixes, comment updates) get the full format.

2. **Every PR MUST include a release tag.** This is mandatory, not optional.
   Every change gets a tag — small or large. I create it via GitHub web UI.

3. **Check existing tags first** before suggesting a tag name. Look at
   the repo's Releases page or run `git tag --list` and pick the next
   logical version number. Don't invent random version numbers.

4. **Tag naming convention:**
   - Small fix / tweak: bump patch → `v1.2.3-YYYY-MM-DD`
   - New feature: bump minor → `v1.3.0-YYYY-MM-DD` or `v1.3-feature-name`
   - Breaking change / major milestone: bump major → `v2.0.0-feature-name`
   - Docs-only updates: `v1.2.3-docs-YYYY-MM-DD`
   - Crash recovery sessions: `v1.2.3-recovery-YYYY-MM-DD`

5. **Never create the tag yourself.** Always just suggest it in the
   handoff. I create tags via the GitHub web UI after merging the PR.

6. **The Compare URL must be clickable and correct.** Double-check the
   repo name, default branch name, and feature branch name. If I click
   a broken URL it wastes my time.

7. **The PR Description goes inside a markdown code block** so I can
   copy-paste the raw markdown into GitHub's description field without
   formatting getting mangled.

### Why this matters

I'm on an iPad or phone most of the time. I can't easily edit your output
to reshape it into a PR. Every time you give me unstructured output I
have to manually rewrite it, which wastes time and introduces typos.
When you use this exact format, I can tap the Compare URL, copy the
title into GitHub's title field, copy the description block into
GitHub's description field, merge, then copy the tag info into
GitHub's release form. Zero rewriting.

Please acknowledge this new rule. From now on, every session-ending
handoff follows this format exactly.
```

---

## Usage notes

### Per-project substitutions

When Claude generates the handoff, it should replace:

- `<REPO>` → the actual repo name (e.g. `aiglitch`, `Master`, `budju-xyz`)
- `<DEFAULT-BRANCH>` → usually `master` (all 7 repos use master)
- `<BRANCH-NAME>` → the feature branch Claude created this session
- `<semver>` → actual version number bumped from the latest existing tag

So for an AIG!itch session, the Compare URL template becomes:
`https://github.com/comfybear71/aiglitch/compare/master...claude/my-feature`

### Mid-session reinforcement

If Claude gives unstructured output anyway after receiving this prompt,
paste this shorter reminder:

```
You forgot the handoff format. Please re-read the rule I gave you and
give me the handoff package in the exact required format — Compare URL,
PR Title, PR Description in a code block, Merge instructions, and
Suggested release tag. Every section is required.
```

That usually snaps them back into line.

### When Claude pushes back or asks questions

Sometimes Claude will say "I don't have permission to create tags" or
"I can't open PRs on your behalf." That's FINE — the handoff format
doesn't require Claude to do any of that. It only requires Claude to
SUGGEST the tag and SHOW the merge steps. You do the actual clicking.

If Claude seems confused about the distinction, paste:

```
You don't create PRs or tags. You only SUGGEST them in the handoff
package. I do the actual clicking via GitHub web UI. The handoff
format is just a text template you give me so I can copy-paste each
block into GitHub.
```

---

## Related documents

- `docs/prompts/starter-prompt.md` — full session starter with all rules
  (includes this handoff format as Step 7)
- `docs/prompts/resume-after-crash-prompt.md` — crash recovery template
  (also includes this handoff format as Step 8)
- `docs/code-preservation-protocol.md` — the full 7-layer backup strategy
- `SAFETY-RULES.md` — universal safety header for every project

---

## File location

This doc lives at `docs/prompts/pr-handoff-format-prompt.md`. It's a
standalone companion to the starter and resume prompts — paste it on
its own when you only need the handoff format, or paste it after the
starter prompt when you want both.
