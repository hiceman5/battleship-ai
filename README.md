# battleship-ai

Browser-based Battleship against an AI opponent. Built with Vite, React,
TypeScript, Tailwind CSS, and shadcn/ui. Client side only — no backend.

## Requirements

- Node.js 20 (see `.nvmrc`)

## Getting started

```bash
nvm use          # selects Node 20 from .nvmrc
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173)
```

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint
- `npm run format` — format with Prettier
- `npm test` — run the unit test suite (Vitest)

## Project structure

- `src/engine/` — pure game rules and shared types (`types.ts`). No React.
- `src/ai/` — pure AI opponent logic. No React.
- `src/ui/` — presentation components only. No game rules.
- `src/state/` — state transitions via `gameReducer.ts`.

See `AGENTS.md` for the architecture rules and `docs/` for the spec and
bug log.
