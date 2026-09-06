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
  onDifficultyChange: (difficulty: Difficulty) => void;
  onNewGame: () => void;
};

export function GameControls({
  difficulty,
  difficultyDisabled = false,
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
