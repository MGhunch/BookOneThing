import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Book One Thing",
  description: "The easy way to share anything, with anyone.",
};

const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";
const ORANGE = "#e8722a";

function SiteHeader() {
  return (
    <header style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "20px 32px",
      fontFamily: SYS,
    }}>
      {/* Logo */}
      <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "9px" }}>
        <div style={{
          width: "28px", height: "28px",
          borderRadius: "9px",
          background: "#1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <div style={{
            width: "10px", height: "10px",
            borderRadius: "50%",
            border: "2.5px solid #fff",
          }} />
        </div>
        <span style={{
          fontSize: "15px",
          fontWeight: 800,
          color: "#1a1a1a",
          letterSpacing: "-0.5px",
        }}>
          book<span style={{ fontWeight: 300 }}>one</span>thing
        </span>
      </a>

      {/* Right link */}
      <a href="/login" style={{
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "1px",
        textTransform: "uppercase",
        color: "#aaa",
        textDecoration: "none",
        fontFamily: SYS,
      }}>
        Find your things ›
      </a>
    </header>
  );
}

function SiteFooter() {
  const links = ["How it works", "FAQ", "Our story", "House rules"];
  return (
    <footer style={{
      position: "fixed",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "10px",
      padding: "20px 32px",
      fontFamily: SYS,
    }}>
      {links.map((link, i) => (
        <div key={link} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <a href={`/${link.toLowerCase().replace(/ /g, "-")}`} style={{
            fontSize: "10px",
            fontWeight: 700,
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            color: "#bbb",
            textDecoration: "none",
          }}>
            {link}
          </a>
          {i < links.length - 1 && (
            <div style={{
              width: "3px", height: "3px",
              borderRadius: "50%",
              background: ORANGE,
              flexShrink: 0,
            }} />
          )}
        </div>
      ))}
    </footer>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: #e8e5e0; font-family: ${SYS}; }
          *::-webkit-scrollbar { display: none; }
        `}</style>
      </head>
      <body>
        <SiteHeader />
        <main style={{ minHeight: "100dvh" }}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
