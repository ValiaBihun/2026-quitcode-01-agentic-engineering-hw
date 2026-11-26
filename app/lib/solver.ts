import { boxCells, boxIndex, cloneBoard, specOf, type Board, type GridSpec } from "./sudoku";

// A human-style logical solver. Unlike countSolutions (blind backtracking),
// every step here is one a person could find and explain:
//
//   1. naked single  — a cell where only one digit is still possible;
//   2. hidden single — a digit that fits in only one cell of a row, column
//                      or box;
//   3. naked pair    — two cells of a unit that can only hold the same two
//                      digits: those digits are removed from the rest of the
//                      unit. A pair never places a digit itself; it unlocks a
//                      single that was hidden before.
//
// It powers the explained Hint button and rates each puzzle by the hardest
// technique it needs. It never guesses: if none of the techniques applies,
// it stops and reports that, instead of silently falling back to search.

export type Technique = "nakedSingle" | "hiddenSingle" | "nakedPair";

export const TECHNIQUE_ORDER: Technique[] = ["nakedSingle", "hiddenSingle", "nakedPair"];

export const TECHNIQUE_LABELS: Record<Technique, string> = {
  nakedSingle: "naked singles",
  hiddenSingle: "hidden singles",
  nakedPair: "naked pairs",
};

export type UnitKind = "row" | "column" | "box";
export type Unit = { kind: UnitKind; index: number };

export type PairElimination = {
  unit: Unit;
  cells: [[number, number], [number, number]];
  digits: [number, number];
};

export type SolverStep = {
  row: number;
  col: number;
  digit: number;
  technique: "nakedSingle" | "hiddenSingle";
  /** For a hidden single: the unit in which the digit had only this cell. */
  unit?: Unit;
  /** Naked pairs that had to be applied before this single appeared. */
  pairs: PairElimination[];
};

/** Candidate bitmasks: bit d set means digit d is still possible in the cell. 0 for filled cells. */
export type Candidates = number[][];

function unitCells(spec: GridSpec, unit: Unit): [number, number][] {
  if (unit.kind === "row") {
    return Array.from({ length: spec.size }, (_, c) => [unit.index, c] as [number, number]);
  }
  if (unit.kind === "column") {
    return Array.from({ length: spec.size }, (_, r) => [r, unit.index] as [number, number]);
  }
  return boxCells(spec, unit.index);
}

function allUnits(spec: GridSpec): Unit[] {
  const units: Unit[] = [];
  for (const kind of ["row", "column", "box"] as UnitKind[]) {
    for (let index = 0; index < spec.size; index++) units.push({ kind, index });
  }
  return units;
}

function bitCount(mask: number): number {
  let count = 0;
  while (mask) {
    mask &= mask - 1;
    count++;
  }
  return count;
}

function digitsOf(mask: number): number[] {
  const digits: number[] = [];
  for (let d = 1; mask >> d; d++) if (mask & (1 << d)) digits.push(d);
  return digits;
}

export function computeCandidates(values: Board): Candidates {
  const spec = specOf(values);
  const all = ((1 << (spec.size + 1)) - 1) & ~1;
  const rows = Array(spec.size).fill(0);
  const cols = Array(spec.size).fill(0);
  const boxes = Array(spec.size).fill(0);
  for (let r = 0; r < spec.size; r++) {
    for (let c = 0; c < spec.size; c++) {
      const v = values[r][c];
      if (v) {
        rows[r] |= 1 << v;
        cols[c] |= 1 << v;
        boxes[boxIndex(spec, r, c)] |= 1 << v;
      }
    }
  }
  return values.map((row, r) =>
    row.map((v, c) => (v ? 0 : all & ~(rows[r] | cols[c] | boxes[boxIndex(spec, r, c)]))),
  );
}

function findNakedSingle(values: Board, cands: Candidates): SolverStep | null {
  for (let r = 0; r < values.length; r++) {
    for (let c = 0; c < values.length; c++) {
      if (values[r][c] === 0 && bitCount(cands[r][c]) === 1) {
        return { row: r, col: c, digit: digitsOf(cands[r][c])[0], technique: "nakedSingle", pairs: [] };
      }
    }
  }
  return null;
}

function findHiddenSingle(
  values: Board,
  cands: Candidates,
  spec: GridSpec,
): SolverStep | null {
  for (const unit of allUnits(spec)) {
    const cells = unitCells(spec, unit).filter(([r, c]) => values[r][c] === 0);
    for (let digit = 1; digit <= spec.size; digit++) {
      const bit = 1 << digit;
      const places = cells.filter(([r, c]) => cands[r][c] & bit);
      if (places.length === 1) {
        const [row, col] = places[0];
        return { row, col, digit, technique: "hiddenSingle", unit, pairs: [] };
      }
    }
  }
  return null;
}

// Finds one naked pair that still removes something, applies the removal to
// `cands` in place and returns it; null if no pair makes progress.
function applyNakedPair(values: Board, cands: Candidates, spec: GridSpec): PairElimination | null {
  for (const unit of allUnits(spec)) {
    const empty = unitCells(spec, unit).filter(([r, c]) => values[r][c] === 0);
    for (let i = 0; i < empty.length; i++) {
      const [r1, c1] = empty[i];
      const mask = cands[r1][c1];
      if (bitCount(mask) !== 2) continue;
      for (let j = i + 1; j < empty.length; j++) {
        const [r2, c2] = empty[j];
        if (cands[r2][c2] !== mask) continue;
        const others = empty.filter((_, k) => k !== i && k !== j);
        if (!others.some(([r, c]) => cands[r][c] & mask)) continue; // nothing to remove
        for (const [r, c] of others) cands[r][c] &= ~mask;
        const [a, b] = digitsOf(mask);
        return { unit, cells: [[r1, c1], [r2, c2]], digits: [a, b] };
      }
    }
  }
  return null;
}

/**
 * Next logical placement for `values`. `cands` carries eliminations from
 * earlier steps (pairs) across calls; pass undefined to start from the board.
 */
export function findNextStep(values: Board, cands?: Candidates): SolverStep | null {
  const spec = specOf(values);
  const working = cands ?? computeCandidates(values);
  const pairs: PairElimination[] = [];

  for (;;) {
    const single =
      findNakedSingle(values, working) ?? findHiddenSingle(values, working, spec);
    if (single) return { ...single, pairs };
    const pair = applyNakedPair(values, working, spec);
    if (!pair) return null;
    pairs.push(pair);
  }
}

export type LogicalSolveResult = {
  solved: boolean;
  values: Board;
  steps: SolverStep[];
  /** Every technique the solve needed, easiest first. */
  techniques: Technique[];
};

function placeDigit(cands: Candidates, spec: GridSpec, row: number, col: number, digit: number) {
  const bit = 1 << digit;
  cands[row][col] = 0;
  for (let i = 0; i < spec.size; i++) {
    cands[row][i] &= ~bit;
    cands[i][col] &= ~bit;
  }
  for (const [r, c] of boxCells(spec, boxIndex(spec, row, col))) cands[r][c] &= ~bit;
}

export function solveLogically(puzzle: Board): LogicalSolveResult {
  const spec = specOf(puzzle);
  const values = cloneBoard(puzzle);
  const cands = computeCandidates(values);
  const steps: SolverStep[] = [];
  const used = new Set<Technique>();

  for (;;) {
    const step = findNextStep(values, cands);
    if (!step) break;
    values[step.row][step.col] = step.digit;
    placeDigit(cands, spec, step.row, step.col, step.digit);
    steps.push(step);
    used.add(step.technique);
    if (step.pairs.length > 0) used.add("nakedPair");
  }

  const solved = values.every((row) => row.every((v) => v !== 0));
  return {
    solved,
    values,
    steps,
    techniques: TECHNIQUE_ORDER.filter((t) => used.has(t)),
  };
}

const unitName = (unit: Unit) => `${unit.kind} ${unit.index + 1}`;
const cellName = ([r, c]: [number, number]) => `R${r + 1}C${c + 1}`;

/** One or two plain sentences a player can follow, e.g. for the Hint panel. */
export function explainStep(step: SolverStep): string {
  const cell = `row ${step.row + 1}, column ${step.col + 1}`;
  const parts = step.pairs.map(
    (p) =>
      `${cellName(p.cells[0])} and ${cellName(p.cells[1])} can only hold ${p.digits[0]} and ${
        p.digits[1]
      }, so no other cell in ${unitName(p.unit)} can.`,
  );
  if (step.technique === "nakedSingle") {
    parts.push(
      `${step.digit} is the only digit left for ${cell}: every other digit is already in its row, column or box.`,
    );
  } else {
    parts.push(
      `${step.digit} has only one place left in ${unitName(step.unit!)}: ${cell}.`,
    );
  }
  return parts.join(" ");
}
