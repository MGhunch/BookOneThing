"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendCodeword, verifyCodeword, setBookerSessionCookie } from "@/app/codeword-actions";
import ModalShell from "@/components/ModalShell";

const ORANGE       = "#e8722a";
const ORANGE_LIGHT = "#fdf4ee";
const DARK         = "#1a1a1a";
const GREY         = "#888";
const BORDER       = "#ede9e3";
const SYS          = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

// ── Staged progress copy ───────────────────────────────────────────────────────

const STAGES = [
  { label: "Crafting email.",                    duration: 1800 },
  { label: "Sending email.",                     duration: 1800 },
  { label: "Watching it float through the web.", duration: 99999 },
];

function useStagedText(resetKey: number) {
  const [stage, setStage] = useState(0);
  useEffect(() => { setStage(0); }, [resetKey]);
  useEffect(() => {
    if (stage >= STAGES.length - 1) return;
    const t = setTimeout(() => setStage(s => s + 1), STAGES[stage].duration);
    return () => clearTimeout(t);
  }, [stage]);
  return { label: STAGES[stage].label, stage };
}

function useFadingLabel(label: string) {
  const [display, setDisplay] = useState(label);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => { setDisplay(label); setVisible(true); }, 220);
    return () => clearTimeout(t);
  }, [label]);
  return { display, visible };
}

// ── Steps progress bar ─────────────────────────────────────────────────────────
// Third segment pulses on a loop — signals "we've done our bit,
// the internet is doing its thing."

function ProgressSteps({ resetKey }: { resetKey: number }) {
  const { label, stage } = useStagedText(resetKey);
  const { display, visible } = useFadingLabel(label);
  const filled = stage + 1;

  return (
    <div style={{ marginBottom: 20 }}>
      <style>{`
        @keyframes segFill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes segPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .seg-fill  { transform-origin: left; animation: segFill 0.4s cubic-bezier(0.32,0.72,0,1); }
        .seg-pulse { animation: segPulse 1.4s ease-in-out infinite; }
      `}</style>
      <div style={{
        fontSize: 13, fontWeight: 500, color: GREY, fontFamily: SYS,
        marginBottom: 10, minHeight: 22,
        opacity: visible ? 1 : 0, transition: "opacity 0.2s ease",
      }}>
        {display}
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map(i => {
          const isFilled  = i < filled;
          const isLooping = i === 2 && filled === 3;
          return (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: BORDER, overflow: "hidden" }}>
              {isFilled && (
                <div
                  key={`seg-${i}-${filled}`}
                  className={isLooping ? "seg-pulse" : "seg-fill"}
                  style={{ height: "100%", width: "100%", background: ORANGE, borderRadius: 4 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── BookerGate ─────────────────────────────────────────────────────────────────

interface BookerGateProps {
  thingId:    string;
  thingName:  string;
  ownerSlug:  string;
  thingSlug:  string;
  headline?:  string;
  subline?:   string;
  doneLabel?: string;
  onClose?:   () => void;
  onDone?:    () => void; // called after successful auth — lets caller resume action
}

type Screen = "email" | "name" | "code" | "done";

export default function BookerGate({
  thingId, thingName, ownerSlug, thingSlug,
  headline  = "Ready to book.",
  subline   = "Just pop in your email.",
  doneLabel = "Go book your thing.",
  onClose,
  onDone,
}: BookerGateProps) {
  const router = useRouter();

  const [screen, setScreen]       = useState<Screen>("email");
  const [email, setEmail]         = useState("");
  const [code, setCode]           = useState("");
  const [firstName, setFirstName] = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [shake, setShake]         = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [resetKey, setResetKey]   = useState(0);

  // ── Read stored name on mount — skip name screen for returning bookers ────
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("bookerName") : null;
    if (stored) setFirstName(stored);
  }, []);

  const validEmail = email.trim().includes("@") && email.trim().includes(".");
  const validCode  = code.trim().length >= 3;
  const validName  = firstName.trim().length >= 1;

  // ── Step 1: send codeword ─────────────────────────────────────────────────
  async function handleSend() {
    if (!validEmail || loading) return;
    setLoading(true);
    setError(null);
    const result = await sendCodeword({
      context: "booker", email: email.trim(), thingId, thingName, ownerSlug, thingSlug,
    });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setResetKey(k => k + 1);
    setScreen(firstName ? "code" : "name");
  }

  // ── Step 2: collect name (skipped for returning bookers) ──────────────────
  function handleName() {
    if (!validName) return;
    setScreen("code");
  }

  // ── Step 3: verify + set session ──────────────────────────────────────────
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
    await setBookerSessionCookie(email.trim(), firstName.trim(), ownerSlug, thingId);
    if (typeof window !== "undefined") {
      localStorage.setItem("bookerName",  firstName.trim());
      localStorage.setItem("bookerEmail", email.trim().toLowerCase());
    }
    setLoading(false);
    router.refresh();
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
        .gate-shake { animation: shake 0.4s ease; }
        .gate-input:focus { outline: none; }
        .gate-cta { transition: all 0.15s; }
        .gate-cta:active { opacity: 0.88; transform: scale(0.99); }
      `}</style>

      {/* ── Email ──────────────────────────────────────────────────────────── */}
      {screen === "email" && (
        <>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 8 }}>
              {headline}
            </div>
            <div style={{ fontSize: 14, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              {subline}
            </div>
          </div>
          <input
            className="gate-input"
            type="email" value={email} autoFocus
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="your@email.com"
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: `1.5px solid ${email ? ORANGE : BORDER}`,
              background: email ? ORANGE_LIGHT : "#f9f8f6",
              fontSize: 15, fontWeight: 500, fontFamily: SYS, color: DARK,
              transition: "all 0.15s", boxSizing: "border-box" as const, marginBottom: 10,
            }}
          />
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10 }}>{error}</div>}
          <button className="gate-cta" onClick={handleSend} disabled={!validEmail || loading}
            style={{
              width: "100%", padding: 15, borderRadius: 13, border: "none",
              background: validEmail ? ORANGE : "#f0ece6",
              color: validEmail ? "#fff" : "#bbb",
              fontSize: 15, fontWeight: 700, fontFamily: SYS,
              cursor: validEmail ? "pointer" : "default", marginBottom: 14,
            }}
          >
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
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12,
              border: `1.5px solid ${firstName ? ORANGE : BORDER}`,
              background: firstName ? ORANGE_LIGHT : "#f9f8f6",
              fontSize: 15, fontWeight: 500, fontFamily: SYS, color: DARK,
              transition: "all 0.15s", boxSizing: "border-box" as const, marginBottom: 10,
            }}
          />
          <button className="gate-cta" onClick={handleName} disabled={!validName}
            style={{
              width: "100%", padding: 15, borderRadius: 13, border: "none",
              background: validName ? ORANGE : "#f0ece6",
              color: validName ? "#fff" : "#bbb",
              fontSize: 15, fontWeight: 700, fontFamily: SYS,
              cursor: validName ? "pointer" : "default", marginBottom: 14,
            }}
          >
            Say hello
          </button>
          <div style={{ textAlign: "center" as const, fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            Your first name is fine.
          </div>
        </>
      )}

      {/* ── Codeword ───────────────────────────────────────────────────────── */}
      {screen === "code" && (
        <>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: DARK, letterSpacing: "-0.5px", fontFamily: SYS, lineHeight: 1.2 }}>
              Enter your codeword.
            </div>
          </div>

          <ProgressSteps resetKey={resetKey} />

          <div className={shake ? "gate-shake" : ""}>
            <input
              className="gate-input"
              type="text" value={code} autoFocus maxLength={10}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="CODEWORD"
              style={{
                width: "100%", padding: "16px", borderRadius: 12,
                textAlign: "center" as const,
                border: `2px solid ${error ? "#c0392b" : code ? ORANGE : BORDER}`,
                background: error ? "#fdf0ee" : code ? ORANGE_LIGHT : "#f9f8f6",
                fontSize: 24, fontWeight: 800, fontFamily: SYS,
                color: error ? "#c0392b" : DARK,
                letterSpacing: "4px", transition: "all 0.15s",
                boxSizing: "border-box" as const, marginBottom: 10,
              }}
            />
          </div>
          {error && <div style={{ fontSize: 12, color: "#c0392b", fontFamily: SYS, marginBottom: 10, textAlign: "center" as const }}>{error}</div>}
          <button className="gate-cta" onClick={handleVerify} disabled={!validCode || loading}
            style={{
              width: "100%", padding: 15, borderRadius: 13, border: "none",
              background: validCode ? ORANGE : "#f0ece6",
              color: validCode ? "#fff" : "#bbb",
              fontSize: 15, fontWeight: 700, fontFamily: SYS,
              cursor: validCode ? "pointer" : "default",
              transition: "all 0.15s", marginBottom: 14,
            }}
          >
            {loading ? "Checking…" : "Unlock"}
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

      {/* ── Done ───────────────────────────────────────────────────────────── */}
      {screen === "done" && (
        <div style={{ textAlign: "center" as const, padding: "8px 0", position: "relative" as const }}>
          <button
            onClick={() => { setDismissed(true); onDone?.(); }}
            style={{ position: "absolute" as const, top: -8, right: -4, background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: 4 }}
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
          <div style={{ fontSize: 14, color: GREY, fontFamily: SYS }}>{doneLabel}</div>
        </div>
      )}
    </ModalShell>
  );
}
