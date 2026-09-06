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
        Fill every row, column and 2x3 box with the digits 1–6. Given clues
        can&apos;t be edited, and duplicate digits are highlighted.
      </PText>
      <SudokuGame />
    </main>
  );
}
