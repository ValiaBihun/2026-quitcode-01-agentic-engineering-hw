# Sudoku (6x6 and 9x9)

A Sudoku game in two sizes — 6x6 (digits 1–6, 2x3 boxes) and classic 9x9 (3x3 boxes) — with
a logical solver behind an explained Hint button. Built with [Next.js](https://nextjs.org) 16
(App Router) and the [Porsche Design System](https://designsystem.porsche.com/) v4.

## Getting started

```bash
npm install
npm run dev
npm test      # node:test via tsx: generator, solver, hints, reducer, save validation
```

Open [http://localhost:3000/2026-quitcode-01-agentic-engineering-hw/](http://localhost:3000/2026-quitcode-01-agentic-engineering-hw/)
(the `basePath` is set for GitHub Pages, so the dev server uses it too).

`npm run build` produces a static export (`out/`) — see `next.config.ts` for the
GitHub Pages `basePath` configuration.

## Notable implementation choices

- **Board cells are plain `<button>` elements styled with CSS Modules, not a Porsche
  Design System component.** PDS has no grid/cell primitive suited to a 6x6 or 9x9
  board with pencil-mark sub-grids, per-cell selection, and row/column/box
  highlighting — everything *around* the board (buttons, select, status, timer) is
  built from PDS components; only the board itself is custom. This is a deliberate
  choice, not an oversight.
- **Game state is a single pure reducer** in `lib/gameReducer.ts` (phase, puzzle, notes,
  timer) rather than scattered `useState`/`useEffect` pairs. Anything random or
  time-based (puzzle generation, wall-clock deltas) is computed by the caller and passed in
  the action, so the reducer is unit-tested without React.
- **Grid size is a property of the board**, not a constant: `gridSpec` (size and box shape)
  is derived from `board.length` in `lib/sudoku.ts`. The uniqueness check uses bitmasks
  and branches on the cell with the fewest candidates, so hard 9x9 puzzles generate in
  milliseconds.
- **The logical solver** (`lib/solver.ts`) uses naked singles, hidden singles and naked
  pairs and never guesses. `lib/hint.ts` turns it into the Hint button: a wrong digit is
  pointed out first, otherwise the next forced digit is revealed with the reason, and a
  fallback to the stored solution is labelled as such. The same solver rates each puzzle.
- **Progress persists to `localStorage`** (`lib/storage.ts`): reloading the page
  resumes the same puzzle, entries, notes, and elapsed time. The save is validated by
  content (digit ranges, a real solution grid, givens matching it), not just by shape.

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [Porsche Design System](https://designsystem.porsche.com/)
