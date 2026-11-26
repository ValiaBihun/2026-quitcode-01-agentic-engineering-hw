export type Board = number[][]; // size x size, 0 = empty
export type Difficulty = "easy" | "medium" | "hard";
export type GridSize = 6 | 9;

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const GRID_SIZES: GridSize[] = [6, 9];

// Box shape per grid size: 6x6 uses 2x3 boxes (6 has no square divisor), 9x9
// the classic 3x3. Everything else — placement rules, conflicts, the
// generator, the logical solver — is derived from this spec, so the size is
// a property of the board itself (board.length), not a global constant.
export type GridSpec = { size: GridSize; boxRows: number; boxCols: number };

const SPECS: Record<GridSize, GridSpec> = {
  6: { size: 6, boxRows: 2, boxCols: 3 },
  9: { size: 9, boxRows: 3, boxCols: 3 },
};

export function isGridSize(value: unknown): value is GridSize {
  return value === 6 || value === 9;
}

export function gridSpec(size: GridSize): GridSpec {
  return SPECS[size];
}

export function specOf(board: Board): GridSpec {
  if (!isGridSize(board.length)) {
    throw new Error(`Unsupported board size: ${board.length}`);
  }
  return SPECS[board.length];
}

// Number of pre-filled cells left after carving the puzzle out of a solved
// grid. For 9x9 these sit comfortably above the 17-clue minimum so greedy
// carving reaches them reliably (checked by tests/sudoku.test.ts).
const DIFFICULTY_GIVENS: Record<GridSize, Record<Difficulty, number>> = {
  6: { easy: 20, medium: 16, hard: 12 },
  9: { easy: 38, medium: 32, hard: 27 },
};

export function givensFor(size: GridSize, difficulty: Difficulty): number {
  return DIFFICULTY_GIVENS[size][difficulty];
}

/** Index of the box containing (row, col), numbered left-to-right, top-to-bottom. */
export function boxIndex(spec: GridSpec, row: number, col: number): number {
  const boxesPerRow = spec.size / spec.boxCols;
  return Math.floor(row / spec.boxRows) * boxesPerRow + Math.floor(col / spec.boxCols);
}

/** Cells of box `box`, in reading order. */
export function boxCells(spec: GridSpec, box: number): [number, number][] {
  const boxesPerRow = spec.size / spec.boxCols;
  const top = Math.floor(box / boxesPerRow) * spec.boxRows;
  const left = (box % boxesPerRow) * spec.boxCols;
  const cells: [number, number][] = [];
  for (let r = top; r < top + spec.boxRows; r++) {
    for (let c = left; c < left + spec.boxCols; c++) cells.push([r, c]);
  }
  return cells;
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function createEmptyBoard(size: GridSize): Board {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function bitCount(mask: number): number {
  let count = 0;
  while (mask) {
    mask &= mask - 1;
    count++;
  }
  return count;
}

// Bitmask bookkeeping shared by the fill and the solution counter: bit d set
// in rows[r] means digit d is already used in row r (likewise cols / boxes).
type Masks = { rows: number[]; cols: number[]; boxes: number[] };

function buildMasks(board: Board, spec: GridSpec): Masks {
  const masks: Masks = {
    rows: Array(spec.size).fill(0),
    cols: Array(spec.size).fill(0),
    boxes: Array(spec.size).fill(0),
  };
  for (let r = 0; r < spec.size; r++) {
    for (let c = 0; c < spec.size; c++) {
      const value = board[r][c];
      if (value !== 0) {
        const bit = 1 << value;
        masks.rows[r] |= bit;
        masks.cols[c] |= bit;
        masks.boxes[boxIndex(spec, r, c)] |= bit;
      }
    }
  }
  return masks;
}

function allDigitsMask(spec: GridSpec): number {
  return ((1 << (spec.size + 1)) - 1) & ~1; // bits 1..size
}

// Randomized backtracking fill: shuffling digit order per cell is what makes
// this fast and produces an unbiased solved grid.
function fillBoard(board: Board, spec: GridSpec, masks: Masks, index = 0): boolean {
  if (index === spec.size * spec.size) return true;

  const row = Math.floor(index / spec.size);
  const col = index % spec.size;
  const box = boxIndex(spec, row, col);
  const used = masks.rows[row] | masks.cols[col] | masks.boxes[box];

  const digits = Array.from({ length: spec.size }, (_, i) => i + 1);
  for (const digit of shuffled(digits)) {
    const bit = 1 << digit;
    if (used & bit) continue;
    board[row][col] = digit;
    masks.rows[row] |= bit;
    masks.cols[col] |= bit;
    masks.boxes[box] |= bit;
    if (fillBoard(board, spec, masks, index + 1)) return true;
    board[row][col] = 0;
    masks.rows[row] &= ~bit;
    masks.cols[col] &= ~bit;
    masks.boxes[box] &= ~bit;
  }
  return false;
}

function generateSolvedBoard(size: GridSize): Board {
  const spec = gridSpec(size);
  const board = createEmptyBoard(size);
  fillBoard(board, spec, buildMasks(board, spec));
  return board;
}

// Counts solutions up to `cap`, stopping early once reached — used to check
// puzzle uniqueness without exhaustively solving an ambiguous board. Always
// branches on the empty cell with the fewest candidates: on 9x9 this is the
// difference between milliseconds and seconds per check.
export function countSolutions(board: Board, cap: number): number {
  const spec = specOf(board);
  const work = cloneBoard(board);
  const masks = buildMasks(work, spec);
  const all = allDigitsMask(spec);

  function search(): number {
    let bestRow = -1;
    let bestCol = -1;
    let bestCandidates = 0;
    let bestCount = spec.size + 1;

    for (let r = 0; r < spec.size; r++) {
      for (let c = 0; c < spec.size; c++) {
        if (work[r][c] !== 0) continue;
        const candidates =
          all & ~(masks.rows[r] | masks.cols[c] | masks.boxes[boxIndex(spec, r, c)]);
        const count = bitCount(candidates);
        if (count === 0) return 0; // dead end
        if (count < bestCount) {
          bestCount = count;
          bestRow = r;
          bestCol = c;
          bestCandidates = candidates;
        }
      }
    }
    if (bestRow === -1) return 1; // no empty cells: one complete solution

    const box = boxIndex(spec, bestRow, bestCol);
    let total = 0;
    for (let digit = 1; digit <= spec.size && total < cap; digit++) {
      const bit = 1 << digit;
      if (!(bestCandidates & bit)) continue;
      work[bestRow][bestCol] = digit;
      masks.rows[bestRow] |= bit;
      masks.cols[bestCol] |= bit;
      masks.boxes[box] |= bit;
      total += search();
      work[bestRow][bestCol] = 0;
      masks.rows[bestRow] &= ~bit;
      masks.cols[bestCol] &= ~bit;
      masks.boxes[box] &= ~bit;
    }
    return total;
  }

  return search();
}

// Removes cells from a solved grid one at a time, keeping each removal only
// if the puzzle still has exactly one solution. A non-unique puzzle would let
// a player fill in a different-but-valid completion that isBoardSolved (which
// diffs against the one stored `solution`) would wrongly reject.
function carvePuzzle(solution: Board, targetGivens: number): Board {
  const size = solution.length;
  const puzzle = cloneBoard(solution);
  const positions = shuffled(
    Array.from({ length: size * size }, (_, i) => [Math.floor(i / size), i % size]),
  );

  let givens = size * size;
  for (const [row, col] of positions) {
    if (givens <= targetGivens) break;

    const previousValue = puzzle[row][col];
    puzzle[row][col] = 0;

    if (countSolutions(puzzle, 2) === 1) {
      givens--;
    } else {
      puzzle[row][col] = previousValue;
    }
  }

  return puzzle;
}

const MAX_CARVE_ATTEMPTS = 20;

function countGivens(puzzle: Board): number {
  return puzzle.reduce((count, row) => count + row.filter((value) => value !== 0).length, 0);
}

export function generatePuzzle(
  difficulty: Difficulty,
  size: GridSize = 6,
): {
  solution: Board;
  puzzle: Board;
  givensMask: boolean[][];
} {
  const target = givensFor(size, difficulty);
  // Greedy carving can get stuck above the target: occasionally (~1 in 5000
  // "hard" 6x6 puzzles, found by tests/sudoku.test.ts) no remaining cell can
  // be removed without losing uniqueness, leaving 13 givens instead of 12.
  // Retry with a fresh grid and removal order; a bounded loop keeps the worst
  // case finite, and the closest result wins if every attempt falls short.
  let solution = generateSolvedBoard(size);
  let puzzle = carvePuzzle(solution, target);
  for (let attempt = 1; attempt < MAX_CARVE_ATTEMPTS && countGivens(puzzle) > target; attempt++) {
    const nextSolution = generateSolvedBoard(size);
    const nextPuzzle = carvePuzzle(nextSolution, target);
    if (countGivens(nextPuzzle) < countGivens(puzzle)) {
      solution = nextSolution;
      puzzle = nextPuzzle;
    }
  }
  const givensMask = puzzle.map((row) => row.map((value) => value !== 0));
  return { solution, puzzle, givensMask };
}

// Recomputed from scratch on every keystroke — at most 81 cells, trivial cost.
export function computeConflicts(board: Board): boolean[][] {
  const spec = specOf(board);
  const conflicts = Array.from({ length: spec.size }, () => Array(spec.size).fill(false));

  function markDuplicates(cells: [number, number][]) {
    const seenAt = new Map<number, [number, number][]>();
    for (const [row, col] of cells) {
      const value = board[row][col];
      if (value === 0) continue;
      const existing = seenAt.get(value) ?? [];
      existing.push([row, col]);
      seenAt.set(value, existing);
    }
    for (const group of seenAt.values()) {
      if (group.length > 1) {
        for (const [row, col] of group) conflicts[row][col] = true;
      }
    }
  }

  for (let i = 0; i < spec.size; i++) {
    markDuplicates(Array.from({ length: spec.size }, (_, col) => [i, col] as [number, number]));
    markDuplicates(Array.from({ length: spec.size }, (_, row) => [row, i] as [number, number]));
    markDuplicates(boxCells(spec, i));
  }

  return conflicts;
}

// Diffing directly against the stored solution subsumes both "is full" and
// "has no conflicts" in one check.
export function isBoardSolved(board: Board, solution: Board): boolean {
  return board.every((row, r) => row.every((value, c) => value === solution[r][c]));
}
