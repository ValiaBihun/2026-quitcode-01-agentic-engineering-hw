import { test } from "node:test";
import assert from "node:assert/strict";
import { planHint } from "../lib/hint";
import { generatePuzzle, type Board } from "../lib/sudoku";

const clone = (b: Board) => b.map((row) => [...row]);

function firstEmpty(board: Board): [number, number] {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board.length; c++) if (board[r][c] === 0) return [r, c];
  }
  throw new Error("full board");
}

test("a wrong digit is pointed out first, without revealing the right one", () => {
  const { puzzle, solution } = generatePuzzle("easy", 6);
  const values = clone(puzzle);
  const [r, c] = firstEmpty(values);
  values[r][c] = (solution[r][c] % 6) + 1; // wrong on purpose
  const plan = planHint(values, solution);
  assert.equal(plan?.kind, "wrong");
  assert.deepEqual([plan!.row, plan!.col], [r, c]);
  assert.ok(!plan!.text.includes(`should be ${solution[r][c]}`));
});

test("otherwise the hint is the next logical step, with the correct digit and a reason", () => {
  const { puzzle, solution } = generatePuzzle("easy", 9);
  const plan = planHint(puzzle, solution);
  assert.equal(plan?.kind, "step");
  if (plan?.kind !== "step") return;
  assert.equal(plan.digit, solution[plan.row][plan.col]);
  assert.equal(puzzle[plan.row][plan.col], 0);
  assert.ok(plan.text.length > 20);
});

test("following hints alone solves an easy puzzle, and every hint is correct", () => {
  const { puzzle, solution } = generatePuzzle("easy", 6);
  const values = clone(puzzle);
  for (let guard = 0; guard < 36; guard++) {
    const plan = planHint(values, solution);
    if (!plan) break;
    assert.notEqual(plan.kind, "wrong");
    if (plan.kind === "wrong") break;
    assert.equal(plan.digit, solution[plan.row][plan.col]);
    values[plan.row][plan.col] = plan.digit;
  }
  assert.deepEqual(values, solution);
});

test("when no technique applies, one cell is revealed from the solution and the hint says so", () => {
  // An empty board with a known 'solution' forces nothing logically.
  const solution = generatePuzzle("easy", 9).solution;
  const values: Board = Array.from({ length: 9 }, () => Array(9).fill(0));
  const plan = planHint(values, solution, { row: 4, col: 7 });
  assert.equal(plan?.kind, "reveal");
  assert.deepEqual([plan!.row, plan!.col], [4, 7], "prefers the selected empty cell");
  assert.match(plan!.text, /revealed from the solution, not deduced/);
});

test("a full, correct board has nothing to hint", () => {
  const { solution } = generatePuzzle("easy", 6);
  assert.equal(planHint(clone(solution), solution), null);
});
