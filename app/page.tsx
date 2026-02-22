"use client";

import Image from "next/image";
import { useState } from "react";

const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";
const ORANGE = "#e8722a";

export default function Home() {
  const [email, setEmail] = useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#e8e5e0",
        fontFamily: SYS,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "56px" }}>
        <Image
          src="/logo.png"
          alt="bookonething"
          width={240}
          height={48}
          style={{ height: "40px", width: "auto" }}
          priority
        />
      </div>

      {/* Hero */}
      <div
        style={{
          maxWidth: "440px",
          textAlign: "center",
          marginBottom: "48px",
        }}
      >
        <h1
          style={{
            fontSize: "48px",
            fontWeight: 800,
            color: "#1a1a1a",
            letterSpacing: "-2px",
            lineHeight: 1.05,
            marginBottom: "20px",
          }}
        >
          The easy way to share anything, with anyone.
        </h1>
        <p
          style={{
            fontSize: "16px",
            color: "#888",
            lineHeight: 1.7,
            marginBottom: "0",
          }}
        >
          Set up your thing. Share a link. Done.
          <br />
          Anyone can book it. No sign ups. No fuss.
        </p>
      </div>

      {/* Login card */}
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#fff",
          borderRadius: "20px",
          padding: "28px 24px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
        }}
      >
        <div
          style={{
            fontSize: "13px",
            fontWeight: 700,
            color: "#bbb",
            letterSpacing: "0.8px",
            textTransform: "uppercase",
            marginBottom: "12px",
            fontFamily: SYS,
          }}
        >
          Book your thing
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            style={{
              flex: 1,
              padding: "13px 15px",
              borderRadius: "12px",
              border: "1.5px solid #ede9e3",
              fontSize: "14px",
              fontFamily: SYS,
              color: "#1a1a1a",
              background: "#fafaf9",
              outline: "none",
            }}
          />
          <button
            style={{
              padding: "13px 20px",
              borderRadius: "12px",
              border: "none",
              background: "#1a1a1a",
              color: "#fff",
              fontSize: "14px",
              fontWeight: 700,
              fontFamily: SYS,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Go
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: "18px" }}>
          <a
            href="/setup"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: ORANGE,
              textDecoration: "none",
              fontFamily: SYS,
            }}
          >
            Set up a new thing ›
          </a>
        </div>
      </div>
    </div>
  );
}
