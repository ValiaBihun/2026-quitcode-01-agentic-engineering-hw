"use client";

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

export function GameActions({
  isPaused,
  onTogglePause,
  pencilMode,
  onTogglePencil,
  pencilDisabled,
  canHint,
  onHint,
}: GameActionsProps) {
  return (
    <div className={styles.actions}>
      <PButton type="button" variant="primary" onClick={onTogglePause}>
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
}
