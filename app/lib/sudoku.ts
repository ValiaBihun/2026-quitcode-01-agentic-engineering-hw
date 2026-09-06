export type Board = number[][]; // SIZE x SIZE, 0 = empty
export type Difficulty = "easy" | "medium" | "hard";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];

export const SIZE = 6;
// Boxes are 2 rows x 3 columns, giving six boxes total (the standard layout
// for 6x6 Sudoku, since 6 has no square divisor other than itself).
export const BOX_ROWS = 2;
export const BOX_COLS = 3;

// Number of pre-filled cells left after carving the puzzle out of a solved grid.
const DIFFICULTY_GIVENS: Record<Difficulty, number> = {
  easy: 20,
  medium: 16,
  hard: 12,
};

function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
}

function getBoxIndex(row: number, col: number): number {
  const boxCols = SIZE / BOX_COLS;
  return Math.floor(row / BOX_ROWS) * boxCols + Math.floor(col / BOX_COLS);
}

function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isValidPlacement(
  board: Board,
  row: number,
  col: number,
  digit: number,
): boolean {
  for (let i = 0; i < SIZE; i++) {
    if (board[row][i] === digit || board[i][col] === digit) return false;
  }
  const boxRow = Math.floor(row / BOX_ROWS) * BOX_ROWS;
  const boxCol = Math.floor(col / BOX_COLS) * BOX_COLS;
  for (let r = boxRow; r < boxRow + BOX_ROWS; r++) {
    for (let c = boxCol; c < boxCol + BOX_COLS; c++) {
      if (board[r][c] === digit) return false;
    }
  }
  return true;
}

// Randomized backtracking fill: shuffling digit order per cell (not just cell
// order) is what makes this fast and produces an unbiased solved grid.
function fillBoard(board: Board, index = 0): boolean {
  if (index === SIZE * SIZE) return true;

  const row = Math.floor(index / SIZE);
  const col = index % SIZE;

  const digits = Array.from({ length: SIZE }, (_, i) => i + 1);
  for (const digit of shuffled(digits)) {
    if (isValidPlacement(board, row, col, digit)) {
      board[row][col] = digit;
      if (fillBoard(board, index + 1)) return true;
      board[row][col] = 0;
    }
  }
  return false;
}

function generateSolvedBoard(): Board {
  const board = createEmptyBoard();
  fillBoard(board);
  return board;
}

// Counts solutions up to `cap`, stopping early once reached — used to check
// puzzle uniqueness without exhaustively solving a (potentially ambiguous)
// board.
function countSolutions(board: Board, cap: number, index = 0): number {
  if (index === SIZE * SIZE) return 1;

  const row = Math.floor(index / SIZE);
  const col = index % SIZE;

  if (board[row][col] !== 0) {
    return countSolutions(board, cap, index + 1);
  }

  let count = 0;
  for (let digit = 1; digit <= SIZE; digit++) {
    if (isValidPlacement(board, row, col, digit)) {
      board[row][col] = digit;
      count += countSolutions(board, cap - count, index + 1);
      board[row][col] = 0;
      if (count >= cap) break;
    }
  }
  return count;
}

// Removes cells from a solved grid one at a time, keeping each removal only
// if the puzzle still has exactly one solution. A non-unique puzzle would let
// a player fill in a different-but-valid completion that isBoardSolved (which
// diffs against the one stored `solution`) would wrongly reject.
function carvePuzzle(solution: Board, targetGivens: number): Board {
  const puzzle = cloneBoard(solution);
  const positions = shuffled(
    Array.from({ length: SIZE * SIZE }, (_, i) => [
      Math.floor(i / SIZE),
      i % SIZE,
    ]),
  );

  let givens = SIZE * SIZE;
  for (const [row, col] of positions) {
    if (givens <= targetGivens) break;

    const previousValue = puzzle[row][col];
    puzzle[row][col] = 0;

    const workingCopy = cloneBoard(puzzle);
    if (countSolutions(workingCopy, 2) === 1) {
      givens--;
    } else {
      puzzle[row][col] = previousValue;
    }
  }

  return puzzle;
}

export function generatePuzzle(difficulty: Difficulty): {
  solution: Board;
  puzzle: Board;
  givensMask: boolean[][];
} {
  const solution = generateSolvedBoard();
  const puzzle = carvePuzzle(solution, DIFFICULTY_GIVENS[difficulty]);
  const givensMask = puzzle.map((row) => row.map((value) => value !== 0));
  return { solution, puzzle, givensMask };
}

// Recomputed from scratch on every keystroke — SIZE*SIZE cells is trivial cost.
export function computeConflicts(board: Board): boolean[][] {
  const conflicts = Array.from({ length: SIZE }, () =>
    Array(SIZE).fill(false),
  );

  function markDuplicates(cells: [number, number][]) {
    const seenAt = new Map<number, [number, number][]>();
    for (const [row, col] of cells) {
      const value = board[row][col];
      if (value === 0) continue;
      const existing = seenAt.get(value) ?? [];
      existing.push([row, col]);
      seenAt.set(value, existing);
    }
    for (const cells of seenAt.values()) {
      if (cells.length > 1) {
        for (const [row, col] of cells) conflicts[row][col] = true;
      }
    }
  }

  for (let row = 0; row < SIZE; row++) {
    markDuplicates(
      Array.from({ length: SIZE }, (_, col) => [row, col] as [number, number]),
    );
  }
  for (let col = 0; col < SIZE; col++) {
    markDuplicates(
      Array.from({ length: SIZE }, (_, row) => [row, col] as [number, number]),
    );
  }
  for (let box = 0; box < SIZE; box++) {
    const cells: [number, number][] = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        if (getBoxIndex(row, col) === box) cells.push([row, col]);
      }
    }
    markDuplicates(cells);
  }

  return conflicts;
}

// Diffing directly against the stored solution subsumes both "is full" and
// "has no conflicts" in one check.
export function isBoardSolved(board: Board, solution: Board): boolean {
  return board.every((row, r) => row.every((value, c) => value === solution[r][c]));
}
