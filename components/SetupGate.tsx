"use client";

import { useState } from "react";
import { sendCodeword, verifyCodeword } from "@/app/codeword-actions";

const ORANGE       = "#e8722a";
const ORANGE_LIGHT = "#fdf4ee";
const DARK         = "#1a1a1a";
const GREY         = "#888";
const BORDER       = "#ede9e3";
const SYS          = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

interface SetupGateProps {
  ownerSlug:     string;
  thingSlug:     string;
  ownerFirstName?: string;
  onActivated:   () => void; // fires setShowActivationModal(true) in Calendar
}

type Screen = "prompt" | "email" | "code";

export default function SetupGate({ ownerSlug, thingSlug, ownerFirstName, onActivated }: SetupGateProps) {
  const [screen, setScreen]   = useState<Screen>("prompt");
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [shake, setShake]     = useState(false);

  const validEmail = email.trim().includes("@") && email.trim().includes(".");
  const validCode  = code.trim().length >= 3;

  async function handleSend() {
    if (!validEmail || loading) return;
    setLoading(true);
    setError(null);
    const result = await sendCodeword({
      context:   "manage",
      email:     email.trim(),
      firstName: ownerFirstName,
    });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setScreen("code");
  }

  async function handleVerify() {
    if (!validCode || loading) return;
    setLoading(true);
    setError(null);
    const result = await verifyCodeword({
      email:   email.trim(),
      code:    code.trim().toUpperCase(),
      context: "manage",
    });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    onActivated();
  }

  // ── Shared input style ─────────────────────────────────────────────────────

  const inputBase = {
    width: "100%", borderRadius: 10, border: "none",
    fontSize: 13, fontWeight: 600, fontFamily: SYS,
    outline: "none", boxSizing: "border-box" as const,
    transition: "all 0.15s",
  };

  const btnBase = {
    borderRadius: 8, border: "none", cursor: "pointer",
    fontSize: 12, fontWeight: 700, fontFamily: SYS,
    transition: "all 0.15s", whiteSpace: "nowrap" as const,
    flexShrink: 0,
  };

  // ── Prompt — the resting banner ─────────────────────────────────────────────

  if (screen === "prompt") {
    return (
      <button
        onClick={() => setScreen("email")}
        style={{
          background: "none", border: "none", cursor: "pointer",
          padding: 0, textAlign: "left" as const, display: "block",
        }}
      >
        <span style={{
          fontSize: 11, fontWeight: 600, color: ORANGE,
          fontFamily: SYS, letterSpacing: "-0.1px",
        }}>
          Tap to activate your thing ›
        </span>
      </button>
    );
  }

  // ── Email — compact inline form ─────────────────────────────────────────────

  if (screen === "email") {
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, fontFamily: SYS, marginBottom: 6 }}>
          Just pop in your email to get a codeword.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="your@email.com"
            autoFocus
            style={{
              ...inputBase,
              padding: "9px 12px",
              flex: 1,
              background: email ? ORANGE_LIGHT : "#f5f4f0",
              border: `1.5px solid ${email ? ORANGE : BORDER}`,
              color: DARK,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!validEmail || loading}
            style={{
              ...btnBase,
              padding: "9px 14px",
              background: validEmail ? ORANGE : "#ede9e3",
              color: validEmail ? "#fff" : "#bbb",
            }}
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
        {error && (
          <div style={{ fontSize: 11, color: "#c0392b", fontFamily: SYS, marginTop: 5 }}>{error}</div>
        )}
      </div>
    );
  }

  // ── Code — compact inline codeword entry ────────────────────────────────────

  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, fontFamily: SYS, marginBottom: 6 }}>
        Check your email. Enter your codeword.
      </div>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-5px); }
          40%,80%  { transform: translateX(5px); }
        }
        .setup-shake { animation: shake 0.4s ease; }
      `}</style>
      <div className={shake ? "setup-shake" : ""} style={{ display: "flex", gap: 6 }}>
        <input
          type="text"
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleVerify()}
          placeholder="CODEWORD"
          maxLength={10}
          autoFocus
          style={{
            ...inputBase,
            padding: "9px 12px",
            flex: 1,
            background: error ? "#fdf0ee" : code ? ORANGE_LIGHT : "#f5f4f0",
            border: `1.5px solid ${error ? "#c0392b" : code ? ORANGE : BORDER}`,
            color: error ? "#c0392b" : DARK,
            letterSpacing: "2px",
            textTransform: "uppercase" as const,
          }}
        />
        <button
          onClick={handleVerify}
          disabled={!validCode || loading}
          style={{
            ...btnBase,
            padding: "9px 14px",
            background: validCode ? DARK : "#ede9e3",
            color: validCode ? "#fff" : "#bbb",
          }}
        >
          {loading ? "…" : "Confirm"}
        </button>
      </div>
      {error && (
        <div style={{ fontSize: 11, color: "#c0392b", fontFamily: SYS, marginTop: 5 }}>{error}</div>
      )}
      <button
        onClick={() => { setScreen("email"); setCode(""); setError(null); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 11, color: GREY, fontFamily: SYS, padding: "4px 0 0",
        }}
      >
        ← Different email
      </button>
    </div>
  );
}
