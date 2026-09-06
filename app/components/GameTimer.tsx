"use client";

import { PText } from "@porsche-design-system/components-react/ssr";

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type GameTimerProps = {
  seconds: number;
};

export function GameTimer({ seconds }: GameTimerProps) {
  return (
    <PText size="lg" weight="semibold">
      Time {formatElapsed(seconds)}
    </PText>
  );
}
