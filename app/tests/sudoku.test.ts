import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BOX_COLS,
  BOX_ROWS,
  DIFFICULTIES,
  SIZE,
  computeConflicts,
  generatePuzzle,
  isBoardSolved,
  type Board,
  type Difficulty,
} from "../lib/sudoku";

const GIVENS: Record<Difficulty, number> = { easy: 20, medium: 16, hard: 12 };

// Independent brute-force solution counter (does not reuse the production one).
function countSolutions(board: Board, cap: number): number {
  let r = -1;
  let c = -1;
  outer: for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board[i][j] === 0) {
        r = i;
        c = j;
        break outer;
      }
    }
  }
  if (r === -1) return 1;

  const boxR = r - (r % BOX_ROWS);
  const boxC = c - (c % BOX_COLS);
  let total = 0;
  for (let d = 1; d <= SIZE && total < cap; d++) {
    const clash =
      board[r].includes(d) ||
      board.some((row) => row[c] === d) ||
      board
        .slice(boxR, boxR + BOX_ROWS)
        .some((row) => row.slice(boxC, boxC + BOX_COLS).includes(d));
    if (clash) continue;
    board[r][c] = d;
    total += countSolutions(board, cap - total);
    board[r][c] = 0;
  }
  return total;
}

for (const difficulty of DIFFICULTIES) {
  test(`generatePuzzle(${difficulty}): unique solution and exact givens, 100 puzzles`, () => {
    for (let i = 0; i < 100; i++) {
      const { solution, puzzle, givensMask } = generatePuzzle(difficulty);
      assert.equal(puzzle.flat().filter((v) => v !== 0).length, GIVENS[difficulty]);
      assert.deepEqual(
        givensMask,
        puzzle.map((row) => row.map((v) => v !== 0)),
      );
      assert.equal(countSolutions(puzzle.map((row) => [...row]), 2), 1);
      assert.equal(computeConflicts(solution).flat().some(Boolean), false);
      puzzle.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v !== 0) assert.equal(v, solution[r][c]);
        }),
      );
    }
  });
}

test("computeConflicts flags duplicates in row, column and box", () => {
  const board: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  board[0][0] = 1;
  board[0][5] = 1; // same row
  board[3][0] = 1; // same column
  board[1][2] = 1; // same 2x3 box as (0,0)
  const conflicts = computeConflicts(board);
  for (const [r, c] of [
    [0, 0],
    [0, 5],
    [3, 0],
    [1, 2],
  ]) {
    assert.equal(conflicts[r][c], true, `(${r},${c}) should conflict`);
  }
  assert.equal(conflicts.flat().filter(Boolean).length, 4);
});

test("computeConflicts ignores empty cells and distinct digits", () => {
  const board: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  board[0][0] = 1;
  board[0][1] = 2;
  assert.equal(computeConflicts(board).flat().some(Boolean), false);
});

test("isBoardSolved accepts the solution and rejects one wrong cell", () => {
  const { solution } = generatePuzzle("easy");
  assert.equal(isBoardSolved(solution, solution), true);
  const board = solution.map((row) => [...row]);
  board[0][0] = (board[0][0] % SIZE) + 1;
  assert.equal(isBoardSolved(board, solution), false);
});
