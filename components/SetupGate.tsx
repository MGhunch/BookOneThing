"use client";

import { useState, useEffect } from "react";
import { sendCodeword, verifyCodeword, activatePendingThing } from "@/app/codeword-actions";
import ModalShell from "@/components/ModalShell";

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
}

type Screen = "email" | "code" | "activating" | "done";

export default function SetupGate({ ownerSlug, thingSlug, ownerFirstName }: SetupGateProps) {
  const [screen, setScreen]   = useState<Screen>("email");
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [shake, setShake]     = useState(false);

  // Read email from sessionStorage if available (set during setup flow)
  useEffect(() => {
    const stored = sessionStorage.getItem("setupEmail");
    if (stored) {
      setEmail(stored);
      setScreen("code");
    }
  }, []);

  const validEmail = email.trim().includes("@") && email.trim().includes(".");
  const validCode  = code.trim().length >= 3;

  async function handleSend() {
    if (!validEmail || loading) return;
    setLoading(true);
    setError(null);
    const result = await sendCodeword({
      context:   "setup",
      email:     email.trim(),
      firstName: ownerFirstName,
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

    setScreen("activating");
    const activateResult = await activatePendingThing(email.trim(), ownerSlug, thingSlug);
    setLoading(false);

    if ("error" in activateResult) {
      setError(activateResult.error);
      setScreen("code");
      return;
    }

    sessionStorage.removeItem("setupEmail");
    if ("shareUrl" in activateResult) setShareUrl(activateResult.shareUrl);
    setScreen("done");
  }

  return (
    <ModalShell>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-6px); }
          40%,80%  { transform: translateX(6px); }
        }
        .setup-shake { animation: shake 0.4s ease; }
        .setup-input:focus { outline: none; }
      `}</style>

      {/* Email */}
      {screen === "email" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              Activate your thing
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              Pop in the email you used to set it up.
            </div>
          </div>
          <input
            className="setup-input"
            type="email" value={email} autoFocus
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="your@email.com"
            style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `1.5px solid ${email ? ORANGE : BORDER}`, background: email ? ORANGE_LIGHT : "#f9f8f6", fontSize: 15, fontWeight: 500, fontFamily: SYS, color: DARK, outline: "none", transition: "all 0.15s", boxSizing: "border-box" as const, marginBottom: 10 }}
          />
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10 }}>{error}</div>}
          <button onClick={handleSend} disabled={!validEmail || loading} style={{ width: "100%", padding: 15, borderRadius: 13, border: "none", background: validEmail ? ORANGE : "#f0ece6", color: validEmail ? "#fff" : "#bbb", fontSize: 15, fontWeight: 700, fontFamily: SYS, cursor: validEmail ? "pointer" : "default", transition: "all 0.15s" }}>
            {loading ? "Sending…" : "Send my codeword"}
          </button>
        </>
      )}

      {/* Code */}
      {screen === "code" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              Enter your codeword
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              Check your email. It expires in 15 minutes.
            </div>
          </div>
          <div className={shake ? "setup-shake" : ""}>
            <input
              className="setup-input"
              type="text" value={code} autoFocus maxLength={10}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="CODEWORD"
              style={{ width: "100%", padding: "16px", borderRadius: 12, textAlign: "center" as const, border: `2px solid ${error ? "#c0392b" : code ? ORANGE : BORDER}`, background: error ? "#fdf0ee" : code ? ORANGE_LIGHT : "#f9f8f6", fontSize: 24, fontWeight: 800, fontFamily: SYS, color: error ? "#c0392b" : DARK, outline: "none", letterSpacing: "4px", transition: "all 0.15s", boxSizing: "border-box" as const, marginBottom: 10 }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10, textAlign: "center" as const }}>{error}</div>}
          <button onClick={handleVerify} disabled={!validCode || loading} style={{ width: "100%", padding: 15, borderRadius: 13, border: "none", background: validCode ? ORANGE : "#f0ece6", color: validCode ? "#fff" : "#bbb", fontSize: 15, fontWeight: 700, fontFamily: SYS, cursor: validCode ? "pointer" : "default", transition: "all 0.15s", marginBottom: 14 }}>
            {loading ? "Checking…" : "Confirm"}
          </button>
          <div style={{ textAlign: "center" as const, fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            Used a different email?{" "}
            <span onClick={() => { setScreen("email"); setCode(""); setError(null); }} style={{ color: ORANGE, fontWeight: 600, cursor: "pointer" }}>
              Try again
            </span>
          </div>
        </>
      )}

      {/* Activating */}
      {screen === "activating" && (
        <div style={{ textAlign: "center" as const, padding: "8px 0" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, marginBottom: 6 }}>
            Activating…
          </div>
          <div style={{ fontSize: 14, color: GREY, fontFamily: SYS }}>Just a moment.</div>
        </div>
      )}

      {/* Done */}
      {screen === "done" && (
        <div style={{ textAlign: "center" as const }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,11 8,17 19,5"/>
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, marginBottom: 6 }}>
            You're live.
          </div>
          <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, marginBottom: 24 }}>
            Share this link and people can start booking.
          </div>

          {shareUrl && (
            <div
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              style={{ background: ORANGE_LIGHT, border: `1.5px solid ${copied ? ORANGE : "#f0e8e0"}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", marginBottom: 20, transition: "all 0.15s" }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" as const, color: ORANGE, fontFamily: SYS, marginBottom: 4 }}>
                {copied ? "Copied!" : "Tap to copy"}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: DARK, fontFamily: SYS, wordBreak: "break-all" as const }}>
                {shareUrl.replace(/^https?:\/\//, "")}
              </div>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{ width: "100%", padding: 15, borderRadius: 13, border: "none", background: DARK, color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: SYS, cursor: "pointer" }}
          >
            Go to my calendar →
          </button>
        </div>
      )}
    </ModalShell>
  );
}
