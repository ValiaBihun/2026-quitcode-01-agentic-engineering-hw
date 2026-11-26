"use client";

import { useRef } from "react";
import { specOf, type Board } from "@/lib/sudoku";
import { SudokuCell, type NavigateDirection } from "./SudokuCell";
import styles from "./SudokuBoard.module.css";

export type SelectedCell = { row: number; col: number } | null;

type SudokuBoardProps = {
  values: Board;
  notes: number[][][];
  givensMask: boolean[][];
  conflicts: boolean[][];
  selectedCell: SelectedCell;
  disabled: boolean;
  onCellSelect: (row: number, col: number) => void;
  onCellDigit: (row: number, col: number, digit: number) => void;
  onCellClear: (row: number, col: number) => void;
};

const DIRECTION_DELTA: Record<NavigateDirection, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

export function SudokuBoard({
  values,
  notes,
  givensMask,
  conflicts,
  selectedCell,
  disabled,
  onCellSelect,
  onCellDigit,
  onCellClear,
}: SudokuBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const spec = specOf(values);
  const { size, boxRows, boxCols } = spec;

  // Tab alone previously covered movement between cells; arrow keys are the
  // conventional way to navigate a grid widget without stepping through
  // every other control on the page each time. Clamped at the edges rather
  // than wrapping, to keep movement predictable.
  function handleNavigate(row: number, col: number, direction: NavigateDirection) {
    const [rowDelta, colDelta] = DIRECTION_DELTA[direction];
    const targetRow = Math.min(size - 1, Math.max(0, row + rowDelta));
    const targetCol = Math.min(size - 1, Math.max(0, col + colDelta));
    const target = boardRef.current?.querySelector<HTMLButtonElement>(
      `[data-row="${targetRow}"][data-col="${targetCol}"]`,
    );
    target?.focus();
  }

  return (
    <div
      ref={boardRef}
      className={styles.board}
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      role="grid"
      aria-label={`Sudoku board, ${size} by ${size}`}
    >
      {values.map((rowValues, row) =>
        rowValues.map((value, col) => {
          const isSelected =
            selectedCell?.row === row && selectedCell?.col === col;
          const isHighlighted =
            !isSelected &&
            selectedCell !== null &&
            (selectedCell.row === row ||
              selectedCell.col === col ||
              (Math.floor(selectedCell.row / boxRows) === Math.floor(row / boxRows) &&
                Math.floor(selectedCell.col / boxCols) === Math.floor(col / boxCols)));

          return (
            <SudokuCell
              key={`${row}-${col}`}
              spec={spec}
              row={row}
              col={col}
              value={value}
              notes={notes[row][col]}
              isGiven={givensMask[row][col]}
              isConflicting={conflicts[row][col]}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              disabled={disabled}
              onSelect={onCellSelect}
              onDigit={onCellDigit}
              onClear={onCellClear}
              onNavigate={handleNavigate}
            />
          );
        }),
      )}
    </div>
  );
}
