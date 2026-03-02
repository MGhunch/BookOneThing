import type { Metadata } from "next";
import Nav from "@/components/Nav";
import "@/styles/buttons.css";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Book One Thing",
  description: "The easy way to share anything, with anyone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <Nav />
        <main style={{ minHeight: "100dvh" }}>{children}</main>
      </body>
    </html>
  );
}
