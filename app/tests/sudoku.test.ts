import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTIES,
  GRID_SIZES,
  computeConflicts,
  generatePuzzle,
  givensFor,
  gridSpec,
  isBoardSolved,
  type Board,
  type GridSize,
} from "../lib/sudoku";

// Independent brute-force solution counter: plain backtracking in reading
// order, deliberately sharing no code with the production counter.
function countSolutions(board: Board, cap: number): number {
  const { size, boxRows, boxCols } = gridSpec(board.length as GridSize);
  let r = -1;
  let c = -1;
  outer: for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] === 0) {
        r = i;
        c = j;
        break outer;
      }
    }
  }
  if (r === -1) return 1;

  const boxR = r - (r % boxRows);
  const boxC = c - (c % boxCols);
  let total = 0;
  for (let d = 1; d <= size && total < cap; d++) {
    const clash =
      board[r].includes(d) ||
      board.some((row) => row[c] === d) ||
      board
        .slice(boxR, boxR + boxRows)
        .some((row) => row.slice(boxC, boxC + boxCols).includes(d));
    if (clash) continue;
    board[r][c] = d;
    total += countSolutions(board, cap - total);
    board[r][c] = 0;
  }
  return total;
}

// 9x9 puzzles are far slower for the naive reference counter, so fewer.
const PUZZLES: Record<GridSize, number> = { 6: 100, 9: 10 };

for (const size of GRID_SIZES) {
  for (const difficulty of DIFFICULTIES) {
    test(`generatePuzzle(${difficulty}, ${size}x${size}): unique solution and exact givens, ${PUZZLES[size]} puzzles`, () => {
      for (let i = 0; i < PUZZLES[size]; i++) {
        const { solution, puzzle, givensMask } = generatePuzzle(difficulty, size);
        assert.equal(puzzle.length, size);
        assert.ok(puzzle.every((row) => row.length === size));
        assert.equal(puzzle.flat().filter((v) => v !== 0).length, givensFor(size, difficulty));
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
}

test("generatePuzzle defaults to 6x6 (saves and calls from before 9x9 keep working)", () => {
  assert.equal(generatePuzzle("easy").puzzle.length, 6);
});

test("computeConflicts flags duplicates in row, column and 2x3 box (6x6)", () => {
  const board: Board = Array.from({ length: 6 }, () => Array(6).fill(0));
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

test("computeConflicts uses 3x3 boxes on 9x9", () => {
  const board: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  board[0][0] = 5;
  board[2][2] = 5; // same 3x3 box, different row and column
  board[3][3] = 7;
  board[5][1] = 7; // different 3x3 boxes: (box 4) vs (box 3), no shared row/column
  const conflicts = computeConflicts(board);
  assert.equal(conflicts[0][0], true);
  assert.equal(conflicts[2][2], true);
  assert.equal(conflicts[3][3], false);
  assert.equal(conflicts[5][1], false);
});

test("computeConflicts ignores empty cells and distinct digits", () => {
  const board: Board = Array.from({ length: 6 }, () => Array(6).fill(0));
  board[0][0] = 1;
  board[0][1] = 2;
  assert.equal(computeConflicts(board).flat().some(Boolean), false);
});

test("isBoardSolved accepts the solution and rejects one wrong cell", () => {
  for (const size of GRID_SIZES) {
    const { solution } = generatePuzzle("easy", size);
    assert.equal(isBoardSolved(solution, solution), true);
    const board = solution.map((row) => [...row]);
    board[0][0] = (board[0][0] % size) + 1;
    assert.equal(isBoardSolved(board, solution), false);
  }
});
