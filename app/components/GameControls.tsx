"use client";

import {
  PButton,
  PSelect,
  PSelectOption,
} from "@porsche-design-system/components-react/ssr";
import type { SelectChangeEventDetail } from "@porsche-design-system/components-react/ssr";
import type { Difficulty } from "@/lib/sudoku";
import { DIFFICULTIES } from "@/lib/sudoku";
import styles from "./GameControls.module.css";

type GameControlsProps = {
  difficulty: Difficulty;
  difficultyDisabled?: boolean;
  /**
   * Bumped whenever a pending difficulty change is cancelled. PSelect is a
   * custom element: when its `value` prop doesn't actually change (the user
   * picked something, then cancelled), React has no reason to re-apply it,
   * so the element's own internal display can stay stuck on the
   * never-committed option. Changing `key` forces a clean remount so it
   * re-reads the real `difficulty` value.
   */
  resetToken?: number;
  onDifficultyChange: (difficulty: Difficulty) => void;
  onNewGame: () => void;
};

export function GameControls({
  difficulty,
  difficultyDisabled = false,
  resetToken,
  onDifficultyChange,
  onNewGame,
}: GameControlsProps) {
  function handleDifficultyChange(event: CustomEvent<SelectChangeEventDetail>) {
    const value = event.detail.value;
    if (typeof value === "string") {
      onDifficultyChange(value as Difficulty);
    }
  }

  return (
    <div className={styles.controls}>
      <PSelect
        key={resetToken}
        name="difficulty"
        label="Difficulty"
        value={difficulty}
        disabled={difficultyDisabled}
        onChange={handleDifficultyChange}
      >
        {DIFFICULTIES.map((level) => (
          <PSelectOption key={level} value={level}>
            {level[0].toUpperCase() + level.slice(1)}
          </PSelectOption>
        ))}
      </PSelect>
      <PButton type="button" variant="primary" onClick={onNewGame}>
        New Game
      </PButton>
    </div>
  );
}
