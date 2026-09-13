# Sudoku (6x6)

A 6x6 Sudoku game (digits 1–6, 2x3 boxes) built with [Next.js](https://nextjs.org) 16
(App Router) and the [Porsche Design System](https://designsystem.porsche.com/) v4.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run build` produces a static export (`out/`) — see `next.config.ts` for the
GitHub Pages `basePath` configuration.

## Notable implementation choices

- **Board cells are plain `<button>` elements styled with CSS Modules, not a Porsche
  Design System component.** PDS has no grid/cell primitive suited to a fixed 6x6
  board with pencil-mark sub-grids, per-cell selection, and row/column/box
  highlighting — everything *around* the board (buttons, select, status, timer) is
  built from PDS components; only the board itself is custom. This is a deliberate
  choice, not an oversight.
- **Game state is a single `useReducer`** in `components/SudokuGame.tsx` (phase,
  puzzle, notes, timer) rather than scattered `useState`/`useEffect` pairs — this is
  what makes pause/resume, the timer, and localStorage persistence straightforward to
  reason about together.
- **Progress persists to `localStorage`** (`lib/storage.ts`): reloading the page
  resumes the same puzzle, entries, notes, and elapsed time instead of losing them.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Porsche Design System](https://designsystem.porsche.com/)
