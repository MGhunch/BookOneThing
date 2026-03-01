import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "@/styles/buttons.css";

export const metadata: Metadata = {
  title: "Book One Thing",
  description: "The easy way to share anything, with anyone.",
};

import { BACKGROUND, SYS } from "@/lib/constants";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: ${BACKGROUND}; font-family: ${SYS}; }
          *::-webkit-scrollbar { display: none; }
        `}</style>
      </head>
      <body>
        <Nav />
        <main style={{ minHeight: "100dvh" }}>{children}</main>
      </body>
    </html>
  );
}
