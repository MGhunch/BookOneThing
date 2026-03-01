"use client";

import { ORANGE, GREY, GREY_LIGHT, DARK, BORDER, SYS, SIZE_SM, SIZE_BASE, SIZE_XL, W_REGULAR, W_MEDIUM, W_BOLD } from "@/lib/constants";

export default function CancelledPage() {
  return (
    <div style={{
      maxWidth: "400px",
      margin: "0 auto",
      padding: "120px 24px 100px",
      fontFamily: SYS,
      textAlign: "center",
    }}>

      {/* Icon */}
      <div style={{
        width: 56, height: 56, borderRadius: 18,
        background: BORDER,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 28px",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke={GREY_LIGHT} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,11 8,17 19,5"/>
        </svg>
      </div>

      <h1 style={{
        fontSize: SIZE_XL, fontWeight: W_BOLD, letterSpacing: "-0.6px",
        color: DARK, margin: "0 0 10px", lineHeight: 1.15,
      }}>
        Booking cancelled
      </h1>

      <p style={{
        fontSize: SIZE_BASE, color: GREY, lineHeight: 1.65,
        margin: "0 0 32px", fontWeight: W_REGULAR,
      }}>
        All sorted. Someone else can grab that slot now
      </p>

      <div style={{ height: 1, background: BORDER, margin: "0 0 32px" }} />

      <button
        onClick={() => window.history.back()}
        style={{
          fontSize: SIZE_SM, fontWeight: W_MEDIUM, color: ORANGE,
          background: "none", border: "none", cursor: "pointer",
          padding: 0, fontFamily: SYS,
        }}
      >
        ← Go back to where you were
      </button>

    </div>
  );
}
