"use client";

import type { CSSProperties, KeyboardEvent } from "react";
import type { GridSpec } from "@/lib/sudoku";
import styles from "./SudokuCell.module.css";

export type NavigateDirection = "up" | "down" | "left" | "right";

const ARROW_KEY_DIRECTIONS: Record<string, NavigateDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

type SudokuCellProps = {
  spec: GridSpec;
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
  onNavigate: (row: number, col: number, direction: NavigateDirection) => void;
};

export function SudokuCell({
  spec,
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
  onNavigate,
}: SudokuCellProps) {
  const { size, boxRows, boxCols } = spec;

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = ARROW_KEY_DIRECTIONS[event.key];
    if (direction) {
      // Navigation applies to given clues too — only entering/clearing a
      // value is blocked for them.
      event.preventDefault();
      onNavigate(row, col, direction);
      return;
    }

    if (isGiven) return;
    if (event.key === "Backspace" || event.key === "Delete") {
      event.preventDefault();
      onClear(row, col);
      return;
    }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= size) {
      event.preventDefault();
      onDigit(row, col, digit);
    }
  }

  const classNames = [
    styles.cell,
    size === 9 ? styles.compact : "",
    row % boxRows === boxRows - 1 && row !== size - 1 ? styles.thickBottom : "",
    col % boxCols === boxCols - 1 && col !== size - 1 ? styles.thickRight : "",
    isGiven ? styles.given : styles.editable,
    isHighlighted ? styles.highlighted : "",
    isConflicting ? styles.conflict : "",
    isSelected ? styles.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Pencil marks mirror the box shape of a full grid: 3 across, 2 rows for
  // 6x6 and 3 rows for 9x9.
  const notesLayout: CSSProperties = {
    gridTemplateColumns: `repeat(3, 1fr)`,
    gridTemplateRows: `repeat(${size / 3}, 1fr)`,
  };

  return (
    <button
      type="button"
      className={classNames}
      disabled={disabled}
      data-row={row}
      data-col={col}
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
        <span className={styles.notes} style={notesLayout}>
          {Array.from({ length: size }, (_, i) => i + 1).map((digit) => (
            <span key={digit} className={styles.noteSlot}>
              {notes.includes(digit) ? digit : ""}
            </span>
          ))}
        </span>
      ) : null}
    </button>
  );
}
