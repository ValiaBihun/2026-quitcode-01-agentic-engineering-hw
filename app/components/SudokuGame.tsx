"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { PButton, PText } from "@porsche-design-system/components-react/ssr";
import {
  computeConflicts,
  generatePuzzle,
  isBoardSolved,
  SIZE,
  type Board,
  type Difficulty,
} from "@/lib/sudoku";
import { SudokuBoard, type SelectedCell } from "./SudokuBoard";
import { GameControls } from "./GameControls";
import { GameActions } from "./GameActions";
import { GameStatus } from "./GameStatus";
import { GameTimer } from "./GameTimer";
import { NumberPad } from "./NumberPad";
import styles from "./SudokuGame.module.css";

type Phase = "idle" | "playing" | "paused";
type Notes = number[][][];

type GameState = {
  difficulty: Difficulty;
  solution: Board | null;
  givensMask: boolean[][] | null;
  values: Board | null;
  notes: Notes | null;
  elapsedSeconds: number;
  phase: Phase;
};

type GameAction =
  | { type: "NEW_GAME"; difficulty?: Difficulty }
  | { type: "START" }
  | { type: "TOGGLE_PAUSE" }
  | { type: "TICK" }
  | {
      type: "INPUT_DIGIT";
      row: number;
      col: number;
      digit: number;
      mode: "value" | "note";
    }
  | { type: "CLEAR_CELL"; row: number; col: number }
  | { type: "REVEAL_CELL"; row: number; col: number };

function createEmptyNotes(): Notes {
  return Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => [] as number[]),
  );
}

function cloneValues(values: Board): Board {
  return values.map((row) => [...row]);
}

function cloneNotes(notes: Notes): Notes {
  return notes.map((row) => row.map((cell) => [...cell]));
}

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "NEW_GAME": {
      const difficulty = action.difficulty ?? state.difficulty;
      const { solution, puzzle, givensMask } = generatePuzzle(difficulty);
      return {
        difficulty,
        solution,
        givensMask,
        values: puzzle,
        notes: createEmptyNotes(),
        elapsedSeconds: 0,
        phase: "idle",
      };
    }
    case "START":
      return state.phase === "idle" ? { ...state, phase: "playing" } : state;
    case "TOGGLE_PAUSE": {
      if (state.phase === "playing") return { ...state, phase: "paused" };
      if (state.phase === "paused") return { ...state, phase: "playing" };
      return state;
    }
    case "TICK":
      return { ...state, elapsedSeconds: state.elapsedSeconds + 1 };
    case "INPUT_DIGIT": {
      if (!state.values || !state.givensMask || !state.notes) return state;
      if (state.givensMask[action.row][action.col]) return state;

      if (action.mode === "value") {
        const values = cloneValues(state.values);
        values[action.row][action.col] = action.digit;
        const notes = cloneNotes(state.notes);
        notes[action.row][action.col] = [];
        return { ...state, values, notes };
      }

      // Notes mode: pencil marks only make sense on a cell with no final
      // value yet.
      if (state.values[action.row][action.col] !== 0) return state;
      const notes = cloneNotes(state.notes);
      const cellNotes = notes[action.row][action.col];
      const existingIndex = cellNotes.indexOf(action.digit);
      if (existingIndex >= 0) {
        cellNotes.splice(existingIndex, 1);
      } else {
        cellNotes.push(action.digit);
        cellNotes.sort((a, b) => a - b);
      }
      return { ...state, notes };
    }
    case "CLEAR_CELL": {
      if (!state.values || !state.givensMask || !state.notes) return state;
      if (state.givensMask[action.row][action.col]) return state;
      const values = cloneValues(state.values);
      values[action.row][action.col] = 0;
      const notes = cloneNotes(state.notes);
      notes[action.row][action.col] = [];
      return { ...state, values, notes };
    }
    case "REVEAL_CELL": {
      if (!state.values || !state.givensMask || !state.notes || !state.solution) {
        return state;
      }
      if (state.givensMask[action.row][action.col]) return state;
      if (state.values[action.row][action.col] !== 0) return state;
      const values = cloneValues(state.values);
      values[action.row][action.col] = state.solution[action.row][action.col];
      const notes = cloneNotes(state.notes);
      notes[action.row][action.col] = [];
      return { ...state, values, notes };
    }
    default:
      return state;
  }
}

export function SudokuGame() {
  const [state, dispatch] = useReducer(gameReducer, {
    difficulty: "medium",
    solution: null,
    givensMask: null,
    values: null,
    notes: null,
    elapsedSeconds: 0,
    phase: "idle",
  });
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);
  const [pencilMode, setPencilMode] = useState(false);

  // Puzzle generation uses Math.random() and must only ever run on the
  // client — running it during server rendering of this client component
  // would produce different output on hydration and trigger a mismatch.
  useEffect(() => {
    dispatch({ type: "NEW_GAME" });
  }, []);

  const conflicts = useMemo(
    () => (state.values ? computeConflicts(state.values) : null),
    [state.values],
  );

  const isWon = useMemo(
    () =>
      state.values && state.solution
        ? isBoardSolved(state.values, state.solution)
        : false,
    [state.values, state.solution],
  );

  const filledCount = useMemo(
    () =>
      state.values
        ? state.values.reduce(
            (count, row) => count + row.filter((value) => value !== 0).length,
            0,
          )
        : 0,
    [state.values],
  );

  // Ticks once a second while actively playing; stops (and freezes the
  // display) on pause and on win.
  useEffect(() => {
    if (state.phase !== "playing" || isWon) return;
    const id = setInterval(() => dispatch({ type: "TICK" }), 1000);
    return () => clearInterval(id);
  }, [state.phase, isWon]);

  function startNewGame(difficulty?: Difficulty) {
    dispatch({ type: "NEW_GAME", difficulty });
    setSelectedCell(null);
  }

  function handleCellDigit(row: number, col: number, digit: number) {
    dispatch({
      type: "INPUT_DIGIT",
      row,
      col,
      digit,
      mode: pencilMode ? "note" : "value",
    });
  }

  function handleCellClear(row: number, col: number) {
    dispatch({ type: "CLEAR_CELL", row, col });
  }

  if (!state.values || !state.givensMask || !state.notes || !conflicts) {
    return <PText>Generating puzzle…</PText>;
  }

  const canHint =
    state.phase === "playing" &&
    !isWon &&
    selectedCell !== null &&
    !state.givensMask[selectedCell.row][selectedCell.col] &&
    state.values[selectedCell.row][selectedCell.col] === 0;

  const boardDisabled = state.phase !== "playing" || isWon;

  return (
    <div className={styles.game}>
      <div className={styles.topRow}>
        <GameControls
          difficulty={state.difficulty}
          difficultyDisabled={state.phase === "paused"}
          onDifficultyChange={(difficulty) => startNewGame(difficulty)}
          onNewGame={() => startNewGame()}
        />
        <GameTimer seconds={state.elapsedSeconds} />
      </div>

      {state.phase !== "idle" && !isWon && (
        <GameActions
          isPaused={state.phase === "paused"}
          onTogglePause={() => dispatch({ type: "TOGGLE_PAUSE" })}
          pencilMode={pencilMode}
          onTogglePencil={() => setPencilMode((value) => !value)}
          pencilDisabled={state.phase === "paused"}
          canHint={canHint}
          onHint={() => {
            if (selectedCell) {
              dispatch({
                type: "REVEAL_CELL",
                row: selectedCell.row,
                col: selectedCell.col,
              });
            }
          }}
        />
      )}

      <GameStatus isWon={isWon} filledCount={filledCount} />

      <div className={styles.boardStage}>
        <div className={state.phase === "paused" ? styles.blurredBoard : undefined}>
          <SudokuBoard
            values={state.values}
            notes={state.notes}
            givensMask={state.givensMask}
            conflicts={conflicts}
            selectedCell={selectedCell}
            disabled={boardDisabled}
            onCellSelect={(row, col) => setSelectedCell({ row, col })}
            onCellDigit={handleCellDigit}
            onCellClear={handleCellClear}
          />
        </div>
        {state.phase === "idle" && (
          <div className={styles.startOverlay}>
            <PButton
              type="button"
              variant="primary"
              onClick={() => dispatch({ type: "START" })}
            >
              Start
            </PButton>
          </div>
        )}
      </div>

      <NumberPad
        disabled={boardDisabled || !selectedCell}
        onDigit={(digit) => {
          if (selectedCell) handleCellDigit(selectedCell.row, selectedCell.col, digit);
        }}
        onClear={() => {
          if (selectedCell) handleCellClear(selectedCell.row, selectedCell.col);
        }}
      />
    </div>
  );
}
