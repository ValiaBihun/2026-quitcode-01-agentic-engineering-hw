import { PHeading, PText } from "@porsche-design-system/components-react/ssr";
import { SudokuGame } from "@/components/SudokuGame";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <PHeading tag="h1" size="xl">
        Sudoku
      </PHeading>
      <PText>
        Fill every row, column and box with each digit once: 1–6 on a 6×6 grid
        with 2×3 boxes, or 1–9 on a classic 9×9. Given clues can&apos;t be
        edited, duplicates are highlighted, and Hint explains why the next
        digit is forced.
      </PText>
      <SudokuGame />
    </main>
  );
}
