import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gameReducer,
  INITIAL_GAME_STATE,
  needsNewGameConfirmation,
  type GameState,
} from "../lib/gameReducer";
import { generatePuzzle } from "../lib/sudoku";

// A started game on a fixed puzzle: every test begins from the same state.
const generated = generatePuzzle("easy");

function newGame(): GameState {
  return gameReducer(INITIAL_GAME_STATE, {
    type: "NEW_GAME",
    difficulty: "easy",
    generated,
  });
}

function playing(): GameState {
  return gameReducer(newGame(), { type: "START" });
}

function firstCell(state: GameState, given: boolean): [number, number] {
  for (let r = 0; r < state.givensMask!.length; r++) {
    for (let c = 0; c < state.givensMask![r].length; c++) {
      if (state.givensMask![r][c] === given) return [r, c];
    }
  }
  throw new Error("no such cell");
}

// --- Timer: major #1 from the 08.09 review ("timer counts ticks, not time") ---

test("TICK adds the real elapsed delta: a tab backgrounded for 5 min shows 5:00", () => {
  const state = gameReducer(playing(), { type: "TICK", deltaMs: 300_000 });
  assert.equal(state.elapsedMs, 300_000);
});

test("TICK keeps sub-second remainders instead of dropping them on pause", () => {
  let state = playing();
  state = gameReducer(state, { type: "TICK", deltaMs: 1000 });
  state = gameReducer(state, { type: "TICK", deltaMs: 400 }); // flush on pause
  state = gameReducer(state, { type: "TOGGLE_PAUSE" });
  assert.equal(state.elapsedMs, 1400);
  assert.equal(state.phase, "paused");
});

// --- Purity: minor from the 08.09 review (generatePuzzle inside the reducer) ---

test("NEW_GAME is pure: same action twice gives identical state", () => {
  const action = { type: "NEW_GAME" as const, difficulty: "easy" as const, generated };
  const a = gameReducer(INITIAL_GAME_STATE, action);
  const b = gameReducer(INITIAL_GAME_STATE, action);
  assert.deepEqual(a, b);
  assert.deepEqual(a.values, generated.puzzle);
});

test("NEW_GAME resets timer, notes and phase", () => {
  let state = gameReducer(playing(), { type: "TICK", deltaMs: 5000 });
  state = gameReducer(state, { type: "NEW_GAME", difficulty: "hard", generated });
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.phase, "idle");
  assert.equal(state.difficulty, "hard");
  assert.ok(state.notes!.flat().every((cell) => cell.length === 0));
});

test("reducer does not mutate the previous state", () => {
  const before = playing();
  const snapshot = JSON.parse(JSON.stringify(before));
  const [r, c] = firstCell(before, false);
  gameReducer(before, { type: "INPUT_DIGIT", row: r, col: c, digit: 1, mode: "value" });
  gameReducer(before, { type: "INPUT_DIGIT", row: r, col: c, digit: 2, mode: "note" });
  gameReducer(before, { type: "TICK", deltaMs: 1000 });
  assert.deepEqual(JSON.parse(JSON.stringify(before)), snapshot);
});

// --- Phase machine ---

test("START only from idle; TOGGLE_PAUSE only between playing and paused", () => {
  const idle = newGame();
  assert.equal(gameReducer(idle, { type: "TOGGLE_PAUSE" }), idle);
  const p = gameReducer(idle, { type: "START" });
  assert.equal(p.phase, "playing");
  assert.equal(gameReducer(p, { type: "START" }), p);
  const paused = gameReducer(p, { type: "TOGGLE_PAUSE" });
  assert.equal(paused.phase, "paused");
  assert.equal(gameReducer(paused, { type: "TOGGLE_PAUSE" }).phase, "playing");
});

// --- Cell edits ---

test("given cells cannot be changed, cleared or revealed", () => {
  const state = playing();
  const [r, c] = firstCell(state, true);
  for (const action of [
    { type: "INPUT_DIGIT" as const, row: r, col: c, digit: 1, mode: "value" as const },
    { type: "CLEAR_CELL" as const, row: r, col: c },
    { type: "REVEAL_CELL" as const, row: r, col: c },
  ]) {
    assert.equal(gameReducer(state, action), state, action.type);
  }
});

test("pencil notes toggle and stay sorted; a final value clears them", () => {
  let state = playing();
  const [r, c] = firstCell(state, false);
  for (const digit of [3, 1, 3, 2]) {
    state = gameReducer(state, { type: "INPUT_DIGIT", row: r, col: c, digit, mode: "note" });
  }
  assert.deepEqual(state.notes![r][c], [1, 2]);
  state = gameReducer(state, { type: "INPUT_DIGIT", row: r, col: c, digit: 4, mode: "value" });
  assert.equal(state.values![r][c], 4);
  assert.deepEqual(state.notes![r][c], []);
  // Notes are ignored on a cell that already has a value.
  assert.equal(
    gameReducer(state, { type: "INPUT_DIGIT", row: r, col: c, digit: 5, mode: "note" }),
    state,
  );
});

test("REVEAL_CELL fills the solution digit only into an empty cell", () => {
  let state = playing();
  const [r, c] = firstCell(state, false);
  const revealed = gameReducer(state, { type: "REVEAL_CELL", row: r, col: c });
  assert.equal(revealed.values![r][c], generated.solution[r][c]);
  state = gameReducer(state, { type: "INPUT_DIGIT", row: r, col: c, digit: 1, mode: "value" });
  assert.equal(gameReducer(state, { type: "REVEAL_CELL", row: r, col: c }), state);
});

test("CLEAR_CELL empties a player cell and its notes", () => {
  let state = playing();
  const [r, c] = firstCell(state, false);
  state = gameReducer(state, { type: "INPUT_DIGIT", row: r, col: c, digit: 2, mode: "value" });
  state = gameReducer(state, { type: "CLEAR_CELL", row: r, col: c });
  assert.equal(state.values![r][c], 0);
  assert.deepEqual(state.notes![r][c], []);
});

// --- Confirmation: major #2 from the 08.09 review (New Game silently discarded progress) ---

test("New Game asks for confirmation only when there is progress to lose", () => {
  assert.equal(needsNewGameConfirmation("playing", false), true);
  assert.equal(needsNewGameConfirmation("paused", false), true);
  assert.equal(needsNewGameConfirmation("idle", false), false);
  assert.equal(needsNewGameConfirmation("playing", true), false);
});

test("NEW_GAME on a 9x9 puzzle sizes the notes grid 9x9", () => {
  const big = generatePuzzle("easy", 9);
  const state = gameReducer(INITIAL_GAME_STATE, { type: "NEW_GAME", difficulty: "easy", generated: big });
  assert.equal(state.notes!.length, 9);
  assert.ok(state.notes!.every((row) => row.length === 9));
});
