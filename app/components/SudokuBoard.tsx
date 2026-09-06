"use client";

import { BOX_COLS, BOX_ROWS, type Board } from "@/lib/sudoku";
import { SudokuCell } from "./SudokuCell";
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
  return (
    <div className={styles.board} role="grid" aria-label="Sudoku board">
      {values.map((rowValues, row) =>
        rowValues.map((value, col) => {
          const isSelected =
            selectedCell?.row === row && selectedCell?.col === col;
          const isHighlighted =
            !isSelected &&
            selectedCell !== null &&
            (selectedCell.row === row ||
              selectedCell.col === col ||
              (Math.floor(selectedCell.row / BOX_ROWS) === Math.floor(row / BOX_ROWS) &&
                Math.floor(selectedCell.col / BOX_COLS) === Math.floor(col / BOX_COLS)));

          return (
            <SudokuCell
              key={`${row}-${col}`}
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
            />
          );
        }),
      )}
    </div>
  );
}
