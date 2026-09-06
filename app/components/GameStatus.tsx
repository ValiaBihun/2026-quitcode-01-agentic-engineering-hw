"use client";

import { PInlineNotification } from "@porsche-design-system/components-react/ssr";
import { SIZE } from "@/lib/sudoku";

type GameStatusProps = {
  isWon: boolean;
  filledCount: number;
};

export function GameStatus({ isWon, filledCount }: GameStatusProps) {
  return isWon ? (
    <PInlineNotification
      heading="You solved it!"
      description="Every cell matches the solution. Start a new game to play again."
      state="success"
      dismissButton={false}
    />
  ) : (
    <PInlineNotification
      heading="In progress"
      description={`${filledCount} of ${SIZE * SIZE} cells filled.`}
      state="info"
      dismissButton={false}
    />
  );
}
