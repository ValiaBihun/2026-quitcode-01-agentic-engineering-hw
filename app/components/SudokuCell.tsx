"use client";

import type { KeyboardEvent } from "react";
import { BOX_COLS, BOX_ROWS, SIZE } from "@/lib/sudoku";
import styles from "./SudokuCell.module.css";

const DIGITS = Array.from({ length: SIZE }, (_, i) => i + 1);

type SudokuCellProps = {
  row: number;
  col: number;
  value: number;
  notes: number[];
  isGiven: boolean;
  isConflicting: boolean;
  isSelected: boolean;
  isHighlighted: boolean;
  disabled: boolean;
  onSelect: (row: number, col: number) => void;
  onDigit: (row: number, col: number, digit: number) => void;
  onClear: (row: number, col: number) => void;
};

export function SudokuCell({
  row,
  col,
  value,
  notes,
  isGiven,
  isConflicting,
  isSelected,
  isHighlighted,
  disabled,
  onSelect,
  onDigit,
  onClear,
}: SudokuCellProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (isGiven) return;
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onClear(row, col);
      return;
    }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= SIZE) {
      event.preventDefault();
      onDigit(row, col, digit);
    }
  }

  const classNames = [
    styles.cell,
    row % BOX_ROWS === BOX_ROWS - 1 && row !== SIZE - 1 ? styles.thickBottom : "",
    col % BOX_COLS === BOX_COLS - 1 && col !== SIZE - 1 ? styles.thickRight : "",
    isGiven ? styles.given : styles.editable,
    isHighlighted ? styles.highlighted : "",
    isConflicting ? styles.conflict : "",
    isSelected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      disabled={disabled}
      onClick={() => onSelect(row, col)}
      onFocus={() => onSelect(row, col)}
      onKeyDown={handleKeyDown}
      aria-label={`Row ${row + 1} column ${col + 1}${isGiven ? ", given" : ""}${
        value ? `, ${value}` : ""
      }`}
    >
      {value !== 0 ? (
        value
      ) : notes.length > 0 ? (
        <span className={styles.notes}>
          {DIGITS.map((digit) => (
            <span key={digit} className={styles.noteSlot}>
              {notes.includes(digit) ? digit : ""}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}
