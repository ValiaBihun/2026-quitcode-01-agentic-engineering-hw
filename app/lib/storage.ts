import type { Board, Difficulty } from "./sudoku";
import { SIZE } from "./sudoku";

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

function isValidSavedGame(value: unknown): value is SavedGame {
  if (typeof value !== "object" || value === null) return false;
  const game = value as Record<string, unknown>;
  return (
    typeof game.difficulty === "string" &&
    isGridWithSize(game.solution, SIZE) &&
    isGridWithSize(game.givensMask, SIZE) &&
    isGridWithSize(game.values, SIZE) &&
    isGridWithSize(game.notes, SIZE) &&
    typeof game.elapsedMs === "number" &&
    (game.phase === "idle" || game.phase === "playing" || game.phase === "paused")
  );
}

// Guards against a corrupted or version-mismatched blob (e.g. left over from
// a build with a different SIZE) rather than falling back to a fresh game.
export function loadSavedGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSavedGame(parsed) ? parsed : null;
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
