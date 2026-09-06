import type { Metadata } from "next";
import { PorscheDesignSystemProvider } from "@porsche-design-system/components-react/ssr";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sudoku",
  description: "A simple Sudoku game built with the Porsche Design System.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="scheme-light-dark">
      <body>
        <PorscheDesignSystemProvider>{children}</PorscheDesignSystemProvider>
      </body>
    </html>
  );
}
