import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeCandidates,
  explainStep,
  findNextStep,
  solveLogically,
} from "../lib/solver";
import { DIFFICULTIES, GRID_SIZES, generatePuzzle, type Board } from "../lib/sudoku";

// A fixed solved 9x9 grid used to build hand-made positions.
const SOLVED_9: Board = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const clone = (b: Board) => b.map((row) => [...row]);
const empty = (size: number): Board => Array.from({ length: size }, () => Array(size).fill(0));

test("candidates exclude digits already in the row, column and box", () => {
  const board = clone(SOLVED_9);
  board[0][0] = 0; // only 5 fits back
  board[0][1] = 0; // only 3 fits back
  const cands = computeCandidates(board);
  assert.equal(cands[0][0], 1 << 5);
  assert.equal(cands[0][1], 1 << 3);
  assert.equal(cands[1][1], 0, "filled cells have no candidates");
});

test("naked single: one empty cell on an otherwise full board", () => {
  const board = clone(SOLVED_9);
  board[4][4] = 0;
  const step = findNextStep(board);
  assert.deepEqual(
    { row: step?.row, col: step?.col, digit: step?.digit, technique: step?.technique },
    { row: 4, col: 4, digit: 5, technique: "nakedSingle" },
  );
  assert.match(explainStep(step!), /5 is the only digit left for row 5, column 5/);
});

test("hidden single: the digit has one place in a row although the cell has several candidates", () => {
  // Row 0 on an empty 9x9: put 1 in rows 1 and 2 of boxes 0 and 1, so in row 0
  // the digit 1 can only go into box 2; then block columns 6 and 7 for 1.
  const board = empty(9);
  board[1][0] = 1; // box 0
  board[2][4] = 1; // box 1
  board[3][6] = 1; // column 6
  board[4][7] = 1; // column 7
  const step = findNextStep(board);
  assert.ok(step);
  assert.equal(step.technique, "hiddenSingle");
  assert.equal(step.digit, 1);
  assert.deepEqual([step.row, step.col], [0, 8]);
  assert.deepEqual(step.unit, { kind: "row", index: 0 });
  assert.ok(computeCandidates(board)[0][8] !== 1 << 1, "the cell itself still has other candidates");
  assert.match(explainStep(step), /1 has only one place left in row 1: row 1, column 9/);
});

test("naked pair eliminations are recorded and explained when a single depends on them", () => {
  // Search generated puzzles for a step that needed a pair: proves the pair
  // path runs end to end and its explanation names both cells and digits.
  let found = false;
  for (let i = 0; i < 300 && !found; i++) {
    const { puzzle, solution } = generatePuzzle("hard", 9);
    for (const step of solveLogically(puzzle).steps) {
      if (step.pairs.length === 0) continue;
      found = true;
      assert.equal(step.digit, solution[step.row][step.col]);
      const pair = step.pairs[0];
      for (const [r, c] of pair.cells) {
        assert.ok(pair.digits.includes(solution[r][c]), "a pair's cells really hold its two digits");
      }
      assert.match(explainStep(step), /R\dC\d and R\dC\d can only hold \d and \d/);
      break;
    }
  }
  assert.ok(found, "expected at least one naked-pair step in 300 hard 9x9 puzzles");
});

test("the solver is sound: every deduced digit matches the unique solution", () => {
  for (const size of GRID_SIZES) {
    for (const difficulty of DIFFICULTIES) {
      for (let i = 0; i < 40; i++) {
        const { puzzle, solution } = generatePuzzle(difficulty, size);
        const result = solveLogically(puzzle);
        for (const step of result.steps) {
          assert.equal(step.digit, solution[step.row][step.col]);
        }
        if (result.solved) assert.deepEqual(result.values, solution);
      }
    }
  }
});

test("the solver never guesses: it stops and reports unsolved when no technique applies", () => {
  const result = solveLogically(empty(9)); // countless solutions, nothing forced
  assert.equal(result.solved, false);
  assert.equal(result.steps.length, 0);
  assert.deepEqual(result.techniques, []);
});

test("every easy 6x6 puzzle is solvable with singles alone", () => {
  for (let i = 0; i < 100; i++) {
    const result = solveLogically(generatePuzzle("easy", 6).puzzle);
    assert.equal(result.solved, true);
    assert.ok(!result.techniques.includes("nakedPair"));
  }
});

test("solveLogically does not modify the puzzle passed in", () => {
  const { puzzle } = generatePuzzle("medium", 9);
  const before = clone(puzzle);
  solveLogically(puzzle);
  assert.deepEqual(puzzle, before);
});
