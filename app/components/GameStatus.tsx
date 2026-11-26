"use client";

import { PInlineNotification } from "@porsche-design-system/components-react/ssr";

type GameStatusProps = {
  isWon: boolean;
  filledCount: number;
  size: number;
  /** One-line puzzle rating from the logical solver, e.g. "Solvable with naked singles". */
  rating: string;
};

export function GameStatus({ isWon, filledCount, size, rating }: GameStatusProps) {
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
      description={`${filledCount} of ${size * size} cells filled. ${rating}`}
      state="info"
      dismissButton={false}
    />
  );
}
