"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  PButton,
  PInlineNotification,
  PText,
} from "@porsche-design-system/components-react/ssr";
import {
  computeConflicts,
  generatePuzzle,
  isBoardSolved,
  type Difficulty,
  type GridSize,
} from "@/lib/sudoku";
import { solveLogically, TECHNIQUE_LABELS } from "@/lib/solver";
import { planHint } from "@/lib/hint";
import { SudokuBoard, type SelectedCell } from "./SudokuBoard";
import { GameControls } from "./GameControls";
import { GameActions } from "./GameActions";
import { GameStatus } from "./GameStatus";
import { GameTimer } from "./GameTimer";
import { NumberPad } from "./NumberPad";
import { ConfirmNewGameModal } from "./ConfirmNewGameModal";
import { loadSavedGame, saveGame } from "@/lib/storage";
import {
  gameReducer,
  INITIAL_GAME_STATE,
  needsNewGameConfirmation,
} from "@/lib/gameReducer";
import styles from "./SudokuGame.module.css";

type NewGameOptions = { difficulty?: Difficulty; size?: GridSize };

export function SudokuGame() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_GAME_STATE);
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);
  const [pencilMode, setPencilMode] = useState(false);
  const [pendingNewGame, setPendingNewGame] = useState<NewGameOptions | null>(null);
  // The latest hint's explanation. Not part of the persisted game: it
  // describes one moment and is cleared by the next move.
  const [hint, setHint] = useState<{ text: string; tone: "info" | "warning" } | null>(null);
  const [difficultySelectResetToken, setDifficultySelectResetToken] = useState(0);
  const pauseButtonRef = useRef<HTMLElement>(null);

  // Puzzle generation uses Math.random() and must only ever run on the
  // client — running it during server rendering of this client component
  // would produce different output on hydration and trigger a mismatch.
  // Restoring from localStorage is equally client-only, so it lives in the
  // same effect: whichever applies, this is the one place initial state
  // comes from after mount.
  useEffect(() => {
    const saved = loadSavedGame();
    if (saved) {
      dispatch({ type: "RESTORE", game: saved });
    } else {
      dispatch({
        type: "NEW_GAME",
        difficulty: "medium",
        generated: generatePuzzle("medium"),
      });
    }
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

  // Rates the current puzzle by the hardest technique the logical solver
  // needs for it, using the givens only (the player's entries don't change
  // how hard the puzzle is).
  const rating = useMemo(() => {
    if (!state.values || !state.givensMask) return "";
    const givensOnly = state.values.map((row, r) =>
      row.map((value, c) => (state.givensMask![r][c] ? value : 0)),
    );
    const result = solveLogically(givensOnly);
    const used = result.techniques.map((t) => TECHNIQUE_LABELS[t]).join(", ");
    return result.solved
      ? `Solvable with ${used || "naked singles"}.`
      : `Needs more than singles and pairs${used ? ` (gets stuck after ${used})` : ""}.`;
    // Givens never change within a game, so the mask identifies the puzzle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.givensMask]);

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

  // Advances the timer by the real wall-clock delta since the last flush,
  // not by counting fixed "1 tick = 1 second" intervals — a backgrounded
  // tab throttles setInterval (Chrome can delay it to once a minute or
  // more), which would otherwise make the displayed time fall behind. On
  // whatever stops ticking (pause, a win, or unmount), the cleanup flushes
  // the exact remaining fraction of a second instead of discarding it.
  useEffect(() => {
    if (state.phase !== "playing" || isWon) return;

    let lastFlushAt = Date.now();

    const id = setInterval(() => {
      const now = Date.now();
      dispatch({ type: "TICK", deltaMs: now - lastFlushAt });
      lastFlushAt = now;
    }, 1000);

    return () => {
      clearInterval(id);
      const now = Date.now();
      const deltaMs = now - lastFlushAt;
      if (deltaMs > 0) dispatch({ type: "TICK", deltaMs });
    };
  }, [state.phase, isWon]);

  // The board's 36 cells (and the NumberPad) toggle `disabled` on pause and
  // resume. Disabling a focused element blurs it straight to
  // document.body with no way back, so a keyboard user could lose their
  // place and land at the very top of the page. Explicitly moving focus to
  // the Pause/Resume button — the one control that's never disabled by
  // phase — keeps it somewhere sensible across both transitions.
  useEffect(() => {
    if (state.phase === "playing" || state.phase === "paused") {
      pauseButtonRef.current?.focus();
    }
  }, [state.phase]);

  // Persists the whole game to localStorage after every change (new puzzle,
  // digit entry, pause/resume, each timer tick) so a reload resumes exactly
  // where the player left off, instead of losing progress.
  useEffect(() => {
    if (!state.values || !state.givensMask || !state.notes || !state.solution) return;
    saveGame({
      difficulty: state.difficulty,
      solution: state.solution,
      givensMask: state.givensMask,
      values: state.values,
      notes: state.notes,
      elapsedMs: state.elapsedMs,
      phase: state.phase,
    });
  }, [state]);

  const size: GridSize = state.values?.length === 9 ? 9 : 6;

  function startNewGame({ difficulty, size: nextSize }: NewGameOptions = {}) {
    const nextDifficulty = difficulty ?? state.difficulty;
    const gridSize = nextSize ?? size;
    dispatch({
      type: "NEW_GAME",
      difficulty: nextDifficulty,
      generated: generatePuzzle(nextDifficulty, gridSize),
    });
    setSelectedCell(null);
    setPendingNewGame(null);
    setHint(null);
  }

  // Changing difficulty or hitting New Game mid-puzzle used to discard the
  // game instantly and irreversibly (NEW_GAME also immediately overwrites
  // the persisted save) — one stray click on a select could throw away real
  // progress. Anything worth losing (started, not yet won) now goes through
  // a confirmation modal instead of applying right away.
  const hasActiveProgress = needsNewGameConfirmation(state.phase, isWon);

  function requestNewGame(options: NewGameOptions = {}) {
    if (hasActiveProgress) {
      setPendingNewGame(options);
    } else {
      startNewGame(options);
    }
  }

  function handleHint() {
    if (!state.values || !state.solution) return;
    const plan = planHint(state.values, state.solution, selectedCell);
    if (!plan) return;
    setSelectedCell({ row: plan.row, col: plan.col });
    if (plan.kind === "wrong") {
      setHint({ text: plan.text, tone: "warning" });
      return;
    }
    // A logical step's digit always equals the solution's (the solver is
    // sound, checked in tests/solver.test.ts), so revealing from the
    // solution places exactly the deduced digit.
    dispatch({ type: "REVEAL_CELL", row: plan.row, col: plan.col });
    setHint({ text: plan.text, tone: "info" });
  }

  function handleCellDigit(row: number, col: number, digit: number) {
    setHint(null);
    dispatch({
      type: "INPUT_DIGIT",
      row,
      col,
      digit,
      mode: pencilMode ? "note" : "value",
    });
  }

  function handleCellClear(row: number, col: number) {
    setHint(null);
    dispatch({ type: "CLEAR_CELL", row, col });
  }

  if (!state.values || !state.givensMask || !state.notes || !conflicts) {
    return <PText>Generating puzzle…</PText>;
  }

  // The hint finds its own cell now (the next logical step), so it no
  // longer needs an empty cell to be selected first.
  const canHint = state.phase === "playing" && !isWon;

  const boardDisabled = state.phase !== "playing" || isWon;

  return (
    <div className={styles.game}>
      <div className={styles.topRow}>
        <GameControls
          difficulty={state.difficulty}
          size={size}
          difficultyDisabled={state.phase === "paused"}
          resetToken={difficultySelectResetToken}
          onDifficultyChange={(difficulty) => requestNewGame({ difficulty })}
          onSizeChange={(nextSize) => requestNewGame({ size: nextSize })}
          onNewGame={() => requestNewGame()}
        />
        <GameTimer seconds={Math.floor(state.elapsedMs / 1000)} />
      </div>

      {state.phase !== "idle" && !isWon && (
        <GameActions
          ref={pauseButtonRef}
          isPaused={state.phase === "paused"}
          onTogglePause={() => dispatch({ type: "TOGGLE_PAUSE" })}
          pencilMode={pencilMode}
          onTogglePencil={() => setPencilMode((value) => !value)}
          pencilDisabled={state.phase === "paused"}
          canHint={canHint}
          onHint={handleHint}
        />
      )}

      <GameStatus isWon={isWon} filledCount={filledCount} size={size} rating={rating} />

      {hint && !isWon && (
        <PInlineNotification
          heading={hint.tone === "warning" ? "Check this cell" : "Hint"}
          description={hint.text}
          state={hint.tone}
          dismissButton
          onDismiss={() => setHint(null)}
        />
      )}

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
        size={size}
        disabled={boardDisabled || !selectedCell}
        onDigit={(digit) => {
          if (selectedCell) handleCellDigit(selectedCell.row, selectedCell.col, digit);
        }}
        onClear={() => {
          if (selectedCell) handleCellClear(selectedCell.row, selectedCell.col);
        }}
      />

      <ConfirmNewGameModal
        open={pendingNewGame !== null}
        onConfirm={() => startNewGame(pendingNewGame ?? {})}
        onCancel={() => {
          setPendingNewGame(null);
          setDifficultySelectResetToken((token) => token + 1);
        }}
      />
    </div>
  );
}
