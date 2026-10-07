<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->


## Shared change contract (Codex / Cursor)
Read `docs/CALCULATOR_HANDOFF.md` before changing the calculator, boot splash or mobile market cards. Inspect the current working diff and preserve unrelated in-progress edits. Do not revert files to an older design to fix a local issue. Keep the shared live-price resolver and run the relevant regression checks before pushing.
