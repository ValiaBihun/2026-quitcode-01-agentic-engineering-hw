"use client";

import { PButton } from "@porsche-design-system/components-react/ssr";
import styles from "./NumberPad.module.css";

type NumberPadProps = {
  size: number;
  disabled: boolean;
  onDigit: (digit: number) => void;
  onClear: () => void;
};

// Cells are plain buttons (not text inputs), so a physical keyboard isn't the
// only way in — this gives touch/mobile users a way to enter digits too.
export function NumberPad({ size, disabled, onDigit, onClear }: NumberPadProps) {
  const digits = Array.from({ length: size }, (_, i) => i + 1);
  return (
    <div className={styles.pad}>
      {digits.map((digit) => (
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
