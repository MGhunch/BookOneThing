import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book One Thing",
  description: "The world's simplest way to share a resource.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#e8e5e0" }}>
        {children}
      </body>
    </html>
  );
}
