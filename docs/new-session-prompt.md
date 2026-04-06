# New Session Starter Prompt

> Copy and paste this into any new Claude Code conversation.
> Replace [PROJECT] with the project name and [TASK] with what you want done.

---

## MANDATORY: Read these files FIRST before doing anything

1. **SAFETY-RULES.md** — Read this file in the project root. These rules override everything. Follow them strictly.
2. **CLAUDE.md** — Read this file in the project root. This is the project's brain — architecture, stack, API keys, critical rules.
3. **HANDOFF.md** — Read this file in the project root. This is the project's memory — current state, what's working, what's broken, what was done last session.

Do NOT write any code until you have read all three files.

## Branch Rules

- You are working on project: **[PROJECT]**
- **Create a new branch** from the current production branch for your work
- **Push your branch to GitHub** when done — this branch will become the production branch on Vercel
- **NEVER push directly to main/master**
- **NEVER change the Vercel production branch** yourself
- Commit frequently with clear, descriptive messages
- Small atomic commits — one logical change per commit

## Your Task

[TASK — describe what you want done here]

## Rules

- Only work on what is asked. Do NOT touch, refactor, or "improve" anything else in the project
- Do NOT delete any files unless explicitly asked
- Do NOT do blanket reverts — fix issues surgically
- If something breaks after 3 attempts, STOP and tell me
- Run the build/type checker before pushing (`npm run build` or `npx tsc --noEmit`)
- Update HANDOFF.md at the end of the session with what you did

## When You're Done

1. Run the build to confirm no errors
2. Commit all changes
3. Push to your branch on GitHub
4. Update HANDOFF.md with a summary of what was done
5. Tell me the branch name so I can set it as production on Vercel
