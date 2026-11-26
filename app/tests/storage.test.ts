import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePuzzle, type GridSize } from "../lib/sudoku";
import { isValidSavedGame, parseSavedGame, type SavedGame } from "../lib/storage";

function validGame(size: GridSize = 6): SavedGame {
  const { solution, puzzle, givensMask } = generatePuzzle("medium", size);
  return {
    difficulty: "medium",
    solution,
    givensMask,
    values: puzzle,
    notes: Array.from({ length: size }, () =>
      Array.from({ length: size }, () => [] as number[]),
    ),
    elapsedMs: 12345,
    phase: "playing",
  };
}

test("accepts a freshly generated game and round-trips through JSON", () => {
  const game = validGame();
  assert.equal(isValidSavedGame(game), true);
  assert.deepEqual(parseSavedGame(JSON.stringify(game)), game);
});

test("accepts a 9x9 game and round-trips it", () => {
  const game = validGame(9);
  assert.equal(isValidSavedGame(game), true);
  assert.deepEqual(parseSavedGame(JSON.stringify(game)), game);
});

test("rejects grids of mixed size (9x9 solution with 6x6 values)", () => {
  const game = validGame(9);
  game.values = validGame(6).values;
  assert.equal(isValidSavedGame(game), false);
});

test("rejects unsupported sizes (4x4, 8x8)", () => {
  for (const size of [4, 8]) {
    const grid = Array.from({ length: size }, () => Array(size).fill(1));
    const game = { ...validGame(6), solution: grid, values: grid };
    assert.equal(isValidSavedGame(game), false, String(size));
  }
});

test("digit 9 is valid on 9x9 but out of range on 6x6", () => {
  const nine = validGame(9);
  const r = nine.givensMask.findIndex((row) => row.some((g) => !g));
  const c = nine.givensMask[r].findIndex((g) => !g);
  nine.values[r][c] = 9;
  assert.equal(isValidSavedGame(nine), true);
  const six = validGame(6);
  const r6 = six.givensMask.findIndex((row) => row.some((g) => !g));
  const c6 = six.givensMask[r6].findIndex((g) => !g);
  six.values[r6][c6] = 9;
  assert.equal(isValidSavedGame(six), false);
});

test("rejects missing or malformed JSON", () => {
  for (const raw of [null, "", "{not json", "null", "[]", '"str"', "42"]) {
    assert.equal(parseSavedGame(raw), null, `raw: ${raw}`);
  }
});

function firstGiven(g: SavedGame): [number, number] {
  const r = g.givensMask.findIndex((row) => row.some(Boolean));
  return [r, g.givensMask[r].findIndex(Boolean)];
}

// Mutators work on a loosely typed copy so invalid shapes can be injected.
type Loose = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const corruptions: Array<[string, (g: Loose) => void]> = [
  ["unknown difficulty", (g) => void (g.difficulty = "nightmare")],
  ["unknown phase", (g) => void (g.phase = "won")],
  ["NaN elapsedMs", (g) => void (g.elapsedMs = NaN)],
  ["negative elapsedMs", (g) => void (g.elapsedMs = -1)],
  ["Infinity elapsedMs", (g) => void (g.elapsedMs = Infinity)],
  ["string elapsedMs", (g) => void (g.elapsedMs = "5")],
  ["value out of range", (g) => void (g.values[0][0] = 9)],
  ["negative value", (g) => void (g.values[0][0] = -1)],
  ["fractional value", (g) => void (g.values[0][0] = 1.5)],
  ["string value", (g) => void (g.values[0][0] = "3")],
  ["solution contains 0", (g) => void (g.solution[0][0] = 0)],
  ["solution is not a valid grid", (g) => void (g.solution[0][0] = g.solution[0][1])],
  ["wrong grid size", (g) => void g.values.pop()],
  ["wrong row length", (g) => void g.values[0].pop()],
  ["non-boolean mask", (g) => void (g.givensMask[0][0] = 1)],
  [
    "given cell contradicts solution",
    (g) => {
      const [r, c] = firstGiven(g as SavedGame);
      g.values[r][c] = (g.solution[r][c] % g.solution.length) + 1;
    },
  ],
  [
    "given cell erased",
    (g) => {
      const [r, c] = firstGiven(g as SavedGame);
      g.values[r][c] = 0;
    },
  ],
  ["note digit out of range", (g) => void g.notes[0][0].push(7)],
  ["duplicate note digits", (g) => void g.notes[0][0].push(2, 2)],
  ["notes cell is not an array", (g) => void (g.notes[0][0] = 5)],
  ["missing field", (g) => void delete g.notes],
];

for (const [name, corrupt] of corruptions) {
  test(`rejects corrupted save: ${name}`, () => {
    const game: Loose = JSON.parse(JSON.stringify(validGame()));
    corrupt(game);
    // Serialise like localStorage would (NaN/Infinity become null).
    assert.equal(parseSavedGame(JSON.stringify(game)), null);
    if (name !== "NaN elapsedMs" && name !== "Infinity elapsedMs") {
      assert.equal(isValidSavedGame(game), false);
    }
  });
}
