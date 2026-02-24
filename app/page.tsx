"use client";

import { useState } from "react";

const ORANGE = "#e8722a";
const DARK   = "#1a1a1a";
const GREY   = "#bbb";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

const NAV_LINKS = [
  { label: "How it works", href: "/how-it-works" },
  { label: "FAQs",         href: "/faq"           },
  { label: "Our story",    href: "/our-story"      },
  { label: "House rules",  href: "/house-rules"    },
];

export default function Home() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", fontFamily: SYS, position: "relative" }}>

      {/* Hamburger button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed", top: "24px", right: "24px", zIndex: 100,
          width: "40px", height: "40px", borderRadius: "10px",
          background: open ? DARK : "rgba(26,26,26,0.08)",
          border: "none", cursor: "pointer",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "5px",
          transition: "background 0.2s",
        }}
        aria-label="Menu"
      >
        {open ? (
          // X
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="2" y1="2" x2="14" y2="14" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            <line x1="14" y1="2" x2="2" y2="14" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        ) : (
          // Hamburger
          <>
            <span style={{ width: "16px", height: "2px", background: DARK, borderRadius: "1px", transition: "all 0.2s" }} />
            <span style={{ width: "16px", height: "2px", background: DARK, borderRadius: "1px", transition: "all 0.2s" }} />
            <span style={{ width: "16px", height: "2px", background: DARK, borderRadius: "1px", transition: "all 0.2s" }} />
          </>
        )}
      </button>

      {/* Dropdown menu */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 90 }}
          />
          {/* Menu */}
          <div style={{
            position: "fixed", top: "72px", right: "24px", zIndex: 100,
            background: "#fff", borderRadius: "16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            padding: "8px", minWidth: "180px",
            animation: "fadeDown 0.15s ease",
          }}>
            <style>{`@keyframes fadeDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            {NAV_LINKS.map(({ label, href }) => (
              <a key={href} href={href} style={{
                display: "block", padding: "11px 16px", borderRadius: "10px",
                fontSize: "14px", fontWeight: 600, color: DARK,
                textDecoration: "none", fontFamily: SYS,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#f5f4f0")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {label}
              </a>
            ))}
          </div>
        </>
      )}

      {/* Hero */}
      <div style={{ maxWidth: "480px", textAlign: "center", marginBottom: "32px" }}>
        <h1 style={{
          fontSize: "52px", fontWeight: 800, color: DARK,
          letterSpacing: "-2px", lineHeight: 1.05, margin: "0 0 20px 0",
        }}>
          The easy way<br />to share anything,<br />with anyone.
        </h1>
        <p style={{
          fontSize: "16px", color: "#888", lineHeight: 1.7, margin: 0, fontWeight: 400,
        }}>
          Set up your thing. Share a link. Done.<br />
          Anyone can book it. No sign ups. No fuss.
        </p>
      </div>

      {/* CTA */}
      <a href="/setup" style={{
        display: "inline-block", background: ORANGE, color: "#fff",
        fontSize: "16px", fontWeight: 600, padding: "16px 36px",
        borderRadius: "16px", textDecoration: "none",
        letterSpacing: "-0.3px", fontFamily: SYS,
      }}>
        Set up your first thing on us
      </a>

      {/* Pricing note */}
      <p style={{ fontSize: "12px", color: GREY, fontFamily: SYS, marginTop: "12px", marginBottom: 0 }}>
        First thing free. Extra things $10 a month.
      </p>

    </div>
  );
}
