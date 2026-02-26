"use client";

import { useState } from "react";

const DARK   = "#1a1a1a";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

const NAV_LINKS = [
  { label: "Home",               href: "/"             },
  { label: "Manage your things", href: "/manage"       },
  { label: "FAQs",               href: "/faq"          },
  { label: "Our story",          href: "/our-story"    },
  { label: "House rules",        href: "/house-rules"  },
];

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 28px", fontFamily: SYS,
      }}>
        {/* Logo */}
        <a href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo2.png" alt="bookonething" style={{ height: "26px", width: "auto" }} />
        </a>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: "38px", height: "38px", borderRadius: "10px",
            background: open ? DARK : "rgba(26,26,26,0.08)",
            border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: "5px", transition: "background 0.2s",
          }}
          aria-label="Menu"
        >
          {open ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="1" y1="1" x2="13" y2="13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
              <line x1="13" y1="1" x2="1" y2="13" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <>
              <span style={{ width: "15px", height: "2px", background: DARK, borderRadius: "1px" }} />
              <span style={{ width: "15px", height: "2px", background: DARK, borderRadius: "1px" }} />
              <span style={{ width: "15px", height: "2px", background: DARK, borderRadius: "1px" }} />
            </>
          )}
        </button>
      </header>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40 }}
        />
      )}

      {/* Dropdown */}
      <div style={{
        position: "fixed", top: "68px", right: "28px", zIndex: 50,
        background: "#fff", borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        padding: "8px", minWidth: "180px",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transform: open ? "translateY(0)" : "translateY(-8px)",
        transition: "opacity 0.15s ease, transform 0.15s ease",
      }}>
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
  );
}

