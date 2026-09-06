"use client";

import { PButton } from "@porsche-design-system/components-react/ssr";
import { SIZE } from "@/lib/sudoku";
import styles from "./NumberPad.module.css";

const DIGITS = Array.from({ length: SIZE }, (_, i) => i + 1);

type NumberPadProps = {
  disabled: boolean;
  onDigit: (digit: number) => void;
  onClear: () => void;
};

// Cells are plain buttons (not text inputs), so a physical keyboard isn't the
// only way in — this gives touch/mobile users a way to enter digits too.
export function NumberPad({ disabled, onDigit, onClear }: NumberPadProps) {
  return (
    <div className={styles.pad}>
      {DIGITS.map((digit) => (
        <PButton
          key={digit}
          type="button"
          variant="secondary"
          compact
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </PButton>
      ))}
      <PButton
        type="button"
        variant="secondary"
        compact
        disabled={disabled}
        onClick={onClear}
      >
        Clear
      </PButton>
    </div>
  );
}
