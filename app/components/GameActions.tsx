"use client";

import { forwardRef } from "react";
import { PButton } from "@porsche-design-system/components-react/ssr";
import styles from "./GameActions.module.css";

type GameActionsProps = {
  isPaused: boolean;
  onTogglePause: () => void;
  pencilMode: boolean;
  onTogglePencil: () => void;
  pencilDisabled: boolean;
  canHint: boolean;
  onHint: () => void;
};

// Forwards a ref to the Pause/Resume button so SudokuGame can explicitly
// refocus it whenever the board's 36 cells (and the NumberPad) toggle
// disabled — disabling a focused element blurs it to document.body with no
// way back, which would otherwise strand a keyboard user at pause/resume.
export const GameActions = forwardRef<HTMLElement, GameActionsProps>(function GameActions(
  { isPaused, onTogglePause, pencilMode, onTogglePencil, pencilDisabled, canHint, onHint },
  pauseButtonRef,
) {
  return (
    <div className={styles.actions}>
      <PButton ref={pauseButtonRef} type="button" variant="primary" onClick={onTogglePause}>
        {isPaused ? "Resume" : "Pause"}
      </PButton>
      <PButton
        type="button"
        variant={pencilMode ? "primary" : "secondary"}
        disabled={pencilDisabled}
        aria={{ "aria-pressed": pencilMode }}
        onClick={onTogglePencil}
      >
        Pencil {pencilMode ? "On" : "Off"}
      </PButton>
      <PButton
        type="button"
        variant="secondary"
        disabled={!canHint}
        onClick={onHint}
      >
        Hint
      </PButton>
    </div>
  );
});
