import { explainStep, findNextStep, type Technique } from "./solver";
import type { Board } from "./sudoku";

// What the Hint button does, as a pure decision over the board — so it can be
// tested without React. Order matters:
//
//   1. A wrong digit on the board poisons every deduction after it (the
//      solver would "prove" things from a false premise), so it is pointed
//      out first, without revealing the correct digit.
//   2. Otherwise the logical solver's next step is revealed together with
//      the reason it is forced.
//   3. If no supported technique applies (harder 9x9 puzzles need more than
//      singles and pairs), one cell is revealed from the stored solution and
//      the hint says so plainly instead of pretending there was a reason.

export type HintPlan =
  | { kind: "wrong"; row: number; col: number; text: string }
  | { kind: "step"; row: number; col: number; digit: number; technique: Technique; text: string }
  | { kind: "reveal"; row: number; col: number; digit: number; text: string };

type Cell = { row: number; col: number } | null;

export function planHint(values: Board, solution: Board, preferred: Cell = null): HintPlan | null {
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values.length; c++) {
      if (values[r][c] !== 0 && values[r][c] !== solution[r][c]) {
        return {
          kind: "wrong",
          row: r,
          col: c,
          text: `The ${values[r][c]} in row ${r + 1}, column ${c + 1} doesn't fit the solution. Clear it first: every deduction after a wrong digit is unreliable.`,
        };
      }
    }
  }

  const step = findNextStep(values);
  if (step) {
    return {
      kind: "step",
      row: step.row,
      col: step.col,
      digit: step.digit,
      technique: step.pairs.length > 0 ? "nakedPair" : step.technique,
      text: explainStep(step),
    };
  }

  let target: Cell =
    preferred && values[preferred.row][preferred.col] === 0 ? preferred : null;
  for (let r = 0; r < values.length && !target; r++) {
    for (let c = 0; c < values.length && !target; c++) {
      if (values[r][c] === 0) target = { row: r, col: c };
    }
  }
  if (!target) return null; // board is full and correct: nothing to hint

  return {
    kind: "reveal",
    row: target.row,
    col: target.col,
    digit: solution[target.row][target.col],
    text: `No single or pair applies right now, so this ${solution[target.row][target.col]} in row ${
      target.row + 1
    }, column ${target.col + 1} is revealed from the solution, not deduced.`,
  };
}
