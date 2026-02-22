"use client";

import Image from "next/image";

const ORANGE = "#e8722a";
const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

export default function Home() {
  const links = ["How it works", "FAQ", "Our story", "House rules"];

  return (
    <div style={{
      minHeight: "100vh",
      background: "#e8e5e0",
      fontFamily: SYS,
      display: "flex",
      flexDirection: "column",
    }}>

      {/* Top nav */}
      <div style={{ padding: "24px 32px", display: "flex", justifyContent: "flex-end" }}>
        <a href="/login" style={{
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.8px",
          textTransform: "uppercase",
          color: "#aaa",
          textDecoration: "none",
          fontFamily: SYS,
        }}>
          Find your things ›
        </a>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px 48px",
      }}>

        {/* Logo */}
        <div style={{ marginBottom: "40px" }}>
          <Image
            src="/logo.png"
            alt="bookonething"
            width={240}
            height={48}
            style={{ height: "36px", width: "auto" }}
            priority
          />
        </div>

        {/* Hero */}
        <div style={{ maxWidth: "440px", textAlign: "center", marginBottom: "32px" }}>
          <h1 style={{
            fontSize: "48px",
            fontWeight: 800,
            color: "#1a1a1a",
            letterSpacing: "-2px",
            lineHeight: 1.05,
            margin: "0 0 16px 0",
          }}>
            The easy way<br />to share anything,<br />with anyone.
          </h1>
          <p style={{
            fontSize: "16px",
            color: "#888",
            lineHeight: 1.7,
            margin: "0",
          }}>
            Set up your thing. Share a link. Done.<br />
            Anyone can book it. No sign ups. No fuss.
          </p>
        </div>

        {/* CTA */}
        <a href="/setup" style={{
          display: "inline-block",
          background: ORANGE,
          color: "#fff",
          fontSize: "16px",
          fontWeight: 700,
          padding: "16px 36px",
          borderRadius: "16px",
          textDecoration: "none",
          letterSpacing: "-0.3px",
          fontFamily: SYS,
        }}>
          Set up your first thing on us
        </a>

        {/* Pricing note */}
        <p style={{ fontSize: "13px", color: "#bbb", fontFamily: SYS, marginTop: "20px", marginBottom: "0" }}>
          First thing free, forever. Additional things $10 a month.
        </p>

      </div>

      {/* Footer */}
      <div style={{ padding: "24px 32px", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}>
        {links.map((link, i) => (
          <div key={link} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <a href={`/${link.toLowerCase().replace(/ /g, "-")}`} style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              color: "#ccc",
              textDecoration: "none",
              fontFamily: SYS,
            }}>
              {link}
            </a>
            {i < links.length - 1 && (
              <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: ORANGE, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>

    </div>
  );
}
