# AGENTS.md

## Project
Browser-based Battleship against an AI opponent.
Stack: Vite + TypeScript + React + Tailwind + shadcn. Client side only, no backend.

## Architecture rules (do not violate)
- `src/engine/` and `src/ai/` contain pure TypeScript. They must never import React.
- `src/ui/` contains presentation only. It must never contain game rules.
- Every state transition goes through `src/state/gameReducer.ts`. No component mutates game state directly.
- Shared types live in `src/engine/types.ts` and are edited only by explicit instruction.

## Definition of done
Before opening a PR: `npm run lint`, `npm test`, and `npm run build` must all pass.
Run the app and verify the changed behavior in the browser. Attach a screenshot or recording.

## Conventions
- Branch naming: `devin/<slice-name>`
- Never commit directly to `main`. Always open a PR.
- Every bug fix ships with a regression test.
