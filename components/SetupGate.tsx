"use client";

import { useState } from "react";
import { sendCodeword, verifyCodeword, activatePendingThing } from "@/app/codeword-actions";

const ORANGE       = "#e8722a";
const ORANGE_LIGHT = "#fdf4ee";
const DARK         = "#1a1a1a";
const GREY         = "#888";
const BORDER       = "#ede9e3";
const SYS          = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

interface SetupGateProps {
  ownerSlug:       string;
  thingSlug:       string;
  ownerFirstName?: string;
  onActivated:     () => void;
}

type Screen = "prompt" | "email" | "code" | "activating";

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
      context:       "setup",
      email:         email.trim(),
      firstName:     ownerFirstName,
      ownerSlug,
      thingSlug,
    });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setScreen("code");
  }

  async function handleVerify() {
    if (!validCode || loading) return;
    setLoading(true);
    setError(null);

    // Step 1: verify the codeword
    const verifyResult = await verifyCodeword({
      email:   email.trim(),
      code:    code.trim().toUpperCase(),
      context: "setup",
    });

    if ("error" in verifyResult) {
      setLoading(false);
      setError(verifyResult.error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // Step 2: activate the pending thing
    setScreen("activating");
    const activateResult = await activatePendingThing(email.trim(), ownerSlug, thingSlug);
    setLoading(false);

    if ("error" in activateResult) {
      setError(activateResult.error);
      setScreen("code");
      return;
    }

    // Done — tell the calendar to show the activation modal
    onActivated();
  }

  const inputBase = {
    width: "100%", borderRadius: 10,
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

  // ── Prompt ──────────────────────────────────────────────────────────────────

  if (screen === "prompt") {
    return (
      <button
        onClick={() => setScreen("email")}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" as const, display: "block" }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: ORANGE, fontFamily: SYS }}>
          Tap to activate your thing ›
        </span>
      </button>
    );
  }

  // ── Activating spinner ──────────────────────────────────────────────────────

  if (screen === "activating") {
    return (
      <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, fontFamily: SYS }}>
        Activating…
      </div>
    );
  }

  // ── Email ───────────────────────────────────────────────────────────────────

  if (screen === "email") {
    return (
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: ORANGE, fontFamily: SYS, marginBottom: 6 }}>
          Just pop in your email to get a codeword.
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="email" value={email} autoFocus
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="your@email.com"
            style={{ ...inputBase, padding: "9px 12px", flex: 1, border: `1.5px solid ${email ? ORANGE : BORDER}`, background: email ? ORANGE_LIGHT : "#f5f4f0", color: DARK }}
          />
          <button onClick={handleSend} disabled={!validEmail || loading}
            style={{ ...btnBase, padding: "9px 14px", background: validEmail ? ORANGE : "#ede9e3", color: validEmail ? "#fff" : "#bbb" }}>
            {loading ? "…" : "Send"}
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: "#c0392b", fontFamily: SYS, marginTop: 5 }}>{error}</div>}
      </div>
    );
  }

  // ── Code ────────────────────────────────────────────────────────────────────

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
          type="text" value={code} autoFocus maxLength={10}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
          onKeyDown={e => e.key === "Enter" && handleVerify()}
          placeholder="CODEWORD"
          style={{ ...inputBase, padding: "9px 12px", flex: 1, border: `1.5px solid ${error ? "#c0392b" : code ? ORANGE : BORDER}`, background: error ? "#fdf0ee" : code ? ORANGE_LIGHT : "#f5f4f0", color: error ? "#c0392b" : DARK, letterSpacing: "2px", textTransform: "uppercase" as const }}
        />
        <button onClick={handleVerify} disabled={!validCode || loading}
          style={{ ...btnBase, padding: "9px 14px", background: validCode ? DARK : "#ede9e3", color: validCode ? "#fff" : "#bbb" }}>
          {loading ? "…" : "Confirm"}
        </button>
      </div>
      {error && <div style={{ fontSize: 11, color: "#c0392b", fontFamily: SYS, marginTop: 5 }}>{error}</div>}
      <button onClick={() => { setScreen("email"); setCode(""); setError(null); }}
        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: GREY, fontFamily: SYS, padding: "4px 0 0" }}>
        ← Different email
      </button>
    </div>
  );
}
