import { test } from "node:test";
import assert from "node:assert/strict";
import { generatePuzzle, SIZE } from "../lib/sudoku";
import { isValidSavedGame, parseSavedGame, type SavedGame } from "../lib/storage";

function validGame(): SavedGame {
  const { solution, puzzle, givensMask } = generatePuzzle("medium");
  return {
    difficulty: "medium",
    solution,
    givensMask,
    values: puzzle,
    notes: Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => [] as number[]),
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
      g.values[r][c] = (g.solution[r][c] % SIZE) + 1;
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
