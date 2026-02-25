"use client";

import { useState } from "react";
import { sendCodeword, verifyCodeword } from "@/app/codeword-actions";
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
}

type Screen = "email" | "code" | "done";

export default function BookerGate({ thingId, thingName, ownerSlug, thingSlug }: BookerGateProps) {
  const [screen, setScreen]   = useState<Screen>("email");
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [shake, setShake]     = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const validEmail = email.trim().includes("@") && email.trim().includes(".");
  const validCode  = code.trim().length >= 3;

  async function handleSend() {
    if (!validEmail || loading) return;
    setLoading(true);
    setError(null);
    const result = await sendCodeword({ context: "booker", email: email.trim(), thingId, thingName, ownerSlug, thingSlug });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setScreen("code");
  }

  async function handleVerify() {
    if (!validCode || loading) return;
    setLoading(true);
    setError(null);
    const result = await verifyCodeword({ email: email.trim(), code: code.trim().toUpperCase(), context: "booker" });
    setLoading(false);
    if ("error" in result) {
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setScreen("done");
    setTimeout(() => setDismissed(true), 1800);
  }

  if (dismissed) return null;

  return (
    <ModalShell>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-6px); }
          40%,80%  { transform: translateX(6px); }
        }
        .shake { animation: shake 0.4s ease; }
      `}</style>

      {screen === "email" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              Book {thingName}
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              Just pop in your email to get a codeword.
            </div>
          </div>
          <input
            type="email" value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="your@email.com" autoFocus
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: `1.5px solid ${email ? ORANGE : BORDER}`,
              background: email ? ORANGE_LIGHT : "#f9f8f6",
              fontSize: 15, fontWeight: 500, fontFamily: SYS, color: DARK,
              outline: "none", transition: "all 0.15s",
              boxSizing: "border-box" as const, marginBottom: 10,
            }}
          />
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleSend} disabled={!validEmail || loading} style={{
            width: "100%", padding: 15, borderRadius: 13, border: "none",
            background: validEmail ? ORANGE : "#f0ece6",
            color: validEmail ? "#fff" : "#bbb",
            fontSize: 15, fontWeight: 700, fontFamily: SYS,
            cursor: validEmail ? "pointer" : "default",
            transition: "all 0.15s", marginBottom: 14,
          }}>
            {loading ? "Sending…" : "Send my codeword"}
          </button>
          <div style={{ textAlign: "center" as const, fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            No passwords. Ever.
          </div>
        </>
      )}

      {screen === "code" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              Enter your codeword.
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              Check your email. It expires in 15 minutes.
            </div>
          </div>
          <div className={shake ? "shake" : ""}>
            <input
              type="text" value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="CODEWORD" maxLength={10} autoFocus
              style={{
                width: "100%", padding: "16px", borderRadius: 12,
                textAlign: "center" as const,
                border: `2px solid ${error ? "#c0392b" : code ? ORANGE : BORDER}`,
                background: error ? "#fdf0ee" : code ? ORANGE_LIGHT : "#f9f8f6",
                fontSize: 24, fontWeight: 800, fontFamily: SYS,
                color: error ? "#c0392b" : DARK,
                outline: "none", letterSpacing: "4px",
                transition: "all 0.15s",
                boxSizing: "border-box" as const, marginBottom: 10,
              }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10, textAlign: "center" as const }}>{error}</div>}
          <button onClick={handleVerify} disabled={!validCode || loading} style={{
            width: "100%", padding: 15, borderRadius: 13, border: "none",
            background: validCode ? DARK : "#f0ece6",
            color: validCode ? "#fff" : "#bbb",
            fontSize: 15, fontWeight: 700, fontFamily: SYS,
            cursor: validCode ? "pointer" : "default",
            transition: "all 0.15s", marginBottom: 14,
          }}>
            {loading ? "Checking…" : "Confirm"}
          </button>
          <div style={{ textAlign: "center" as const, fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            Didn't get it?{" "}
            <span onClick={() => { setScreen("email"); setCode(""); setError(null); }}
              style={{ color: ORANGE, fontWeight: 600, cursor: "pointer" }}>
              Send another
            </span>
          </div>
        </>
      )}

      {screen === "done" && (
        <div style={{ textAlign: "center" as const, padding: "8px 0" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", background: ORANGE,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
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
