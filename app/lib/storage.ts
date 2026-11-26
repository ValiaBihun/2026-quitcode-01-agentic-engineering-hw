import type { Board, Difficulty } from "./sudoku";
import { DIFFICULTIES, gridSpec, isGridSize, type GridSize } from "./sudoku";

export type Phase = "idle" | "playing" | "paused";
export type Notes = number[][][];

export type SavedGame = {
  difficulty: Difficulty;
  solution: Board;
  givensMask: boolean[][];
  values: Board;
  notes: Notes;
  elapsedMs: number;
  phase: Phase;
};

const STORAGE_KEY = "sudoku-save-v1";

function isGridWithSize(value: unknown, size: number): value is unknown[][] {
  return (
    Array.isArray(value) &&
    value.length === size &&
    value.every((row) => Array.isArray(row) && row.length === size)
  );
}

function isDigit(value: unknown, min: number, size: GridSize): value is number {
  return Number.isInteger(value) && (value as number) >= min && (value as number) <= size;
}

function everyCell(grid: unknown[][], check: (cell: unknown) => boolean): boolean {
  return grid.every((row) => row.every(check));
}

// A completed grid is a valid Sudoku solution only if every row, column and
// box holds each of 1..size exactly once.
function isCompleteSolution(grid: number[][], size: GridSize): boolean {
  const { boxRows, boxCols } = gridSpec(size);
  const groups: number[][] = [];
  for (let i = 0; i < size; i++) {
    groups.push(grid[i]);
    groups.push(grid.map((row) => row[i]));
  }
  for (let r = 0; r < size; r += boxRows) {
    for (let c = 0; c < size; c += boxCols) {
      const box: number[] = [];
      for (let dr = 0; dr < boxRows; dr++) {
        for (let dc = 0; dc < boxCols; dc++) box.push(grid[r + dr][c + dc]);
      }
      groups.push(box);
    }
  }
  return groups.every((group) => new Set(group).size === size);
}

function areValidNotes(notes: unknown[][], size: GridSize): boolean {
  return everyCell(
    notes,
    (cell) =>
      Array.isArray(cell) &&
      cell.length <= size &&
      cell.every((n) => isDigit(n, 1, size)) &&
      new Set(cell).size === cell.length,
  );
}

// Validates the *content*, not just the shape. A blob that passes only a
// shape check (right grid sizes) can still carry out-of-range digits, a NaN
// timer or givens that contradict the solution — and since the game re-saves
// its state on every change, that would be written back and poison every
// following load.
export function isValidSavedGame(value: unknown): value is SavedGame {
  if (typeof value !== "object" || value === null) return false;
  const game = value as Record<string, unknown>;

  if (!DIFFICULTIES.includes(game.difficulty as Difficulty)) return false;
  if (!(game.phase === "idle" || game.phase === "playing" || game.phase === "paused")) {
    return false;
  }
  if (
    typeof game.elapsedMs !== "number" ||
    !Number.isFinite(game.elapsedMs) ||
    game.elapsedMs < 0
  ) {
    return false;
  }

  // The grid size is not stored separately: it is the solution's length, and
  // every other grid must match it. Saves from before 9x9 existed are 6x6
  // and load unchanged.
  if (!Array.isArray(game.solution) || !isGridSize(game.solution.length)) return false;
  const size: GridSize = game.solution.length;
  if (
    !isGridWithSize(game.solution, size) ||
    !isGridWithSize(game.givensMask, size) ||
    !isGridWithSize(game.values, size) ||
    !isGridWithSize(game.notes, size)
  ) {
    return false;
  }
  if (!everyCell(game.solution, (c) => isDigit(c, 1, size))) return false;
  if (!everyCell(game.values, (c) => isDigit(c, 0, size))) return false;
  if (!everyCell(game.givensMask, (c) => typeof c === "boolean")) return false;
  if (!areValidNotes(game.notes, size)) return false;

  const solution = game.solution as number[][];
  const values = game.values as number[][];
  const givensMask = game.givensMask as boolean[][];
  if (!isCompleteSolution(solution, size)) return false;

  // Given cells are immutable: they must be filled and match the solution.
  return givensMask.every((row, r) =>
    row.every((isGiven, c) => !isGiven || values[r][c] === solution[r][c]),
  );
}

export function parseSavedGame(raw: string | null): SavedGame | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isValidSavedGame(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function loadSavedGame(): SavedGame | null {
  try {
    return parseSavedGame(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveGame(game: SavedGame): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  } catch {
    // Ignore storage failures (private browsing, quota, disabled storage) —
    // the game still works this session, it just won't survive a reload.
  }
}
