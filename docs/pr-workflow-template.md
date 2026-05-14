# PR Workflow Template — Copy-Paste Reference

> Bookmark this page. Use it every time you merge a PR on GitHub web UI.
> Works on iPad, phone, and desktop.

---

## Step 1 — Create the Pull Request

Open the compare URL (Claude provides this at end of session):

```
https://github.com/comfybear71/<REPO>/compare/master...claude/<BRANCH>
```

### PR Title (paste into title field)
```
<one-line title, max 70 chars>
```

### PR Description (paste into description field)
```markdown
## Summary
<1-3 sentence overview of what changed and why>

## Changes
- `<file>`: <what changed>
- `<file>`: <what changed>

## Test plan
- [x] Type check passes
- [x] Build passes
- [ ] <manual verification step>
- [ ] <manual verification step>
```

Click green **Create pull request**.

---

## Step 2 — Squash and Merge

1. Scroll to the bottom of the PR page
2. Click the **dropdown arrow** (▼) next to the green merge button
3. Select **Squash and merge** (NOT "Create a merge commit")
4. Review the squashed commit message — edit if needed
5. Click **Confirm squash and merge**

> **Why squash?** All commits on the branch get combined into one
> clean commit on master. Linear history, easy rollbacks, clean log.

---

## Step 3 — Delete the Branch

After merging, GitHub shows a purple banner:

> "Pull request successfully merged and closed"
> **Delete branch** button

Click **Delete branch**. Done. The branch is gone.

> **Why delete?** Dead branches clutter the repo. The code is safe
> on master now. If you ever need it, GitHub keeps deleted branch
> refs recoverable for ~90 days.

---

## Step 4 — Create the Release Tag

Go to:
```
https://github.com/comfybear71/<REPO>/releases/new
```

### Tag name (paste into "Choose a tag" field)
```
v<X.Y.Z>-<YYYY-MM-DD>
```

### Target
```
master
```

### Release title (paste into title field)
```
v<X.Y.Z> — <one-line change summary>
```

### Release description (paste into description field)
```markdown
## v<X.Y.Z>

### New
- <what shipped>

### Fixed
- <what was fixed>

### Changed
- <what was changed>
```

Click **Publish release**.

---

## Version Numbering

| Change type | What to bump | Example |
|---|---|---|
| Small fix / tweak | Patch (Z) | `v1.2.3` → `v1.2.4` |
| New feature / endpoint | Minor (Y) | `v1.2.4` → `v1.3.0` |
| Breaking change | Major (X) | `v1.3.0` → `v2.0.0` |
| Docs only | Patch + `-docs` | `v1.2.4-docs-2026-04-18` |
| Crash recovery | Patch + `-recovery` | `v1.2.4-recovery-2026-04-18` |

**Date suffix is ALWAYS appended:** `vX.Y.Z-YYYY-MM-DD`

---

## Complete Example

### PR Title
```
Fix AFL icon size on sports page
```

### PR Description
```markdown
## Summary
AFL icon was tiny (w-8) on the sports category page. Increased to w-16
for better visibility on mobile and desktop.

## Changes
- `app/dashboard/sports/page.tsx`: AFL icon className w-8 h-8 → w-16 h-16

## Test plan
- [x] Build passes
- [ ] Visit /dashboard/sports → AFL icon is visually larger
- [ ] Other sport icons unaffected
```

### Tag name
```
v1.0.1-2026-04-18
```

### Tag title
```
v1.0.1 — Fix AFL icon size
```

### Tag description
```markdown
## v1.0.1

### Fixed
- AFL icon enlarged from w-8 to w-16 on sports category page
```

---

## Checklist (tap through every time)

- [ ] PR created with title + description
- [ ] Diff reviewed (no accidental changes)
- [ ] **Squash and merge** (not regular merge)
- [ ] Branch deleted
- [ ] Release tag created with name + title + description
- [ ] Verify deploy is green on Vercel
