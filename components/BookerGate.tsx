"use client";

import { useState } from "react";
import { sendCodeword, verifyCodeword, setBookerSessionCookie } from "@/app/codeword-actions";
import ModalShell from "@/components/ModalShell";

const ORANGE       = "#e8722a";
const ORANGE_LIGHT = "#fdf4ee";
const DARK         = "#1a1a1a";
const GREY         = "#888";
const BORDER       = "#ede9e3";
const SYS          = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

interface BookerGateProps {
  thingId:   string;
  thingName: string;
  ownerSlug: string;
  thingSlug: string;
  onClose?:  () => void;
}

type Screen = "email" | "name" | "code" | "done";

export default function BookerGate({ thingId, thingName, ownerSlug, thingSlug, onClose }: BookerGateProps) {
  const [screen, setScreen]       = useState<Screen>("email");
  const [email, setEmail]         = useState("");
  const [code, setCode]           = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [shake, setShake]         = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const validEmail = email.trim().includes("@") && email.trim().includes(".");
  const validCode  = code.trim().length >= 3;
  const validName  = firstName.trim().length >= 1;

  // ── Step 1: send codeword, move to name ───────────────────────────────────

  async function handleSend() {
    if (!validEmail || loading) return;
    setLoading(true);
    setError(null);
    const result = await sendCodeword({
      context: "booker", email: email.trim(), thingId, thingName, ownerSlug, thingSlug,
    });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    // Check localStorage for stored name — skip name screen if known
    const storedName = typeof window !== "undefined" ? localStorage.getItem("bookerName") : null;
    if (storedName) { setFirstName(storedName); }
    setScreen("name");
  }

  // ── Step 2: collect name, move to codeword ────────────────────────────────

  async function handleName() {
    if (!validName || loading) return;
    setScreen("code");
  }

  // ── Step 3: verify codeword + finish auth ─────────────────────────────────

  async function handleVerify() {
    if (!validCode || loading) return;
    setLoading(true);
    setError(null);
    const result = await verifyCodeword({
      email: email.trim(), code: code.trim().toUpperCase(), context: "booker",
    });
    if ("error" in result) {
      setLoading(false);
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    await setBookerSessionCookie(email.trim(), firstName.trim());
    if (typeof window !== "undefined") {
      localStorage.setItem("bookerName",  firstName.trim());
      localStorage.setItem("bookerEmail", email.trim().toLowerCase());
    }
    setLoading(false);
    setScreen("done");
  }

  if (dismissed) return null;

  return (
    <ModalShell onBackdropClick={onClose}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-6px); }
          40%,80%  { transform: translateX(6px); }
        }
        .shake { animation: shake 0.4s ease; }
        .gate-input:focus { outline: none; }
      `}</style>

      {/* ── Email ──────────────────────────────────────────────────────────── */}
      {screen === "email" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              Ready to book.
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              Just pop in your email.
            </div>
          </div>
          <input
            className="gate-input"
            type="email" value={email} autoFocus
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="your@email.com"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${email ? ORANGE : BORDER}`, background: email ? ORANGE_LIGHT : "#f9f8f6", fontSize: 15, fontWeight: 500, fontFamily: SYS, color: DARK, outline: "none", transition: "all 0.15s", boxSizing: "border-box" as const, marginBottom: 10 }}
          />
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleSend} disabled={!validEmail || loading} style={{ width: "100%", padding: 15, borderRadius: 13, border: "none", background: validEmail ? ORANGE : "#f0ece6", color: validEmail ? "#fff" : "#bbb", fontSize: 15, fontWeight: 700, fontFamily: SYS, cursor: validEmail ? "pointer" : "default", transition: "all 0.15s", marginBottom: 14 }}>
            {loading ? "Sending…" : "Get a codeword"}
          </button>
          <div style={{ textAlign: "center" as const, fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            No pesky passwords.
          </div>
        </>
      )}

      {/* ── Name ───────────────────────────────────────────────────────────── */}
      {screen === "name" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              What's your name?
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              So we can tell who's who.
            </div>
          </div>
          <input
            className="gate-input"
            type="text" value={firstName} autoFocus
            onChange={e => { setFirstName(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleName()}
            placeholder="First name"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${firstName ? ORANGE : BORDER}`, background: firstName ? ORANGE_LIGHT : "#f9f8f6", fontSize: 15, fontWeight: 500, fontFamily: SYS, color: DARK, outline: "none", transition: "all 0.15s", boxSizing: "border-box" as const, marginBottom: 10 }}
          />
          <button onClick={handleName} disabled={!validName || loading} style={{ width: "100%", padding: 15, borderRadius: 13, border: "none", background: validName ? ORANGE : "#f0ece6", color: validName ? "#fff" : "#bbb", fontSize: 15, fontWeight: 700, fontFamily: SYS, cursor: validName ? "pointer" : "default", transition: "all 0.15s", marginBottom: 14 }}>
            Say hello
          </button>
          <div style={{ textAlign: "center" as const, fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            Your first name is fine.
          </div>
        </>
      )}

      {/* ── Code ───────────────────────────────────────────────────────────── */}
      {screen === "code" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              Enter your codeword.
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              In your email. It takes a minute.
            </div>
          </div>
          <div className={shake ? "shake" : ""}>
            <input
              className="gate-input"
              type="text" value={code} autoFocus maxLength={10}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="CODEWORD"
              style={{ width: "100%", padding: "16px", borderRadius: 12, textAlign: "center" as const, border: `2px solid ${error ? "#c0392b" : code ? ORANGE : BORDER}`, background: error ? "#fdf0ee" : code ? ORANGE_LIGHT : "#f9f8f6", fontSize: 24, fontWeight: 800, fontFamily: SYS, color: error ? "#c0392b" : DARK, outline: "none", letterSpacing: "4px", transition: "all 0.15s", boxSizing: "border-box" as const, marginBottom: 10 }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10, textAlign: "center" as const }}>{error}</div>}
          <button onClick={handleVerify} disabled={!validCode || loading} style={{ width: "100%", padding: 15, borderRadius: 13, border: "none", background: validCode ? ORANGE : "#f0ece6", color: validCode ? "#fff" : "#bbb", fontSize: 15, fontWeight: 700, fontFamily: SYS, cursor: validCode ? "pointer" : "default", transition: "all 0.15s", marginBottom: 14 }}>
            {loading ? "Checking…" : "Unlock"}
          </button>
          <div style={{ textAlign: "center" as const, fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            Didn't get it?{" "}
            <span onClick={() => { setScreen("email"); setCode(""); setError(null); }} style={{ color: ORANGE, fontWeight: 600, cursor: "pointer" }}>
              Send another
            </span>
          </div>
        </>
      )}

      {/* ── Done ───────────────────────────────────────────────────────────── */}
      {screen === "done" && (
        <div style={{ textAlign: "center" as const, padding: "8px 0", position: "relative" as const }}>
          <button
            onClick={() => setDismissed(true)}
            style={{ position: "absolute" as const, top: -8, right: -4, background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,11 8,17 19,5"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, marginBottom: 6 }}>
            You're in.
          </div>
          <div style={{ fontSize: 14, color: GREY, fontFamily: SYS }}>Go book your thing.</div>
        </div>
      )}
    </ModalShell>
  );
}
