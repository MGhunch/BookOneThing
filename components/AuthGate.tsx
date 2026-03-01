"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { sendCodeword, verifyCodeword, setBookerSessionCookie } from "@/app/codeword-actions";
import ModalShell from "@/components/ModalShell";

import { ORANGE, ORANGE_MID, ORANGE_LIGHT, GREY, GREY_LIGHT, DARK, WHITE, BORDER, BACKGROUND, RED_ERRORTOAST, SYS, SIZE_XS, SIZE_SM, SIZE_LG, W_REGULAR, W_MEDIUM, W_BOLD } from "@/lib/constants";

// ── Domain scraping for org name ──────────────────────────────────────────────

const CONSUMER_DOMAINS = new Set([
  "gmail.com","googlemail.com","yahoo.com","yahoo.co.uk","yahoo.com.au",
  "yahoo.co.nz","hotmail.com","hotmail.co.uk","hotmail.com.au",
  "outlook.com","outlook.co.nz","outlook.com.au",
  "icloud.com","me.com","mac.com",
  "live.com","live.co.uk","live.com.au","msn.com",
  "protonmail.com","proton.me","fastmail.com","fastmail.com.au",
  "aol.com","ymail.com","zoho.com",
]);

function extractOrgName(email: string): string {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain || CONSUMER_DOMAINS.has(domain)) return "My Organisation";
  const base = domain.split(".")[0].replace(/-/g, " ");
  return base.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

// ── Progress stages ───────────────────────────────────────────────────────────

const STAGES = [
  { copy: "Writing your email"  },
  { copy: "Sending your email"  },
  { copy: "Watching your inbox" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export interface AuthGateProps {
  thingId?:   string;
  thingName?: string;
  ownerSlug?: string;
  thingSlug?: string;
  /** Show organisation screen — for new owners in setup flow */
  isOwner?:  boolean;
  /** Server action context — defaults to "booker" */
  context?:  "booker" | "manage" | "setup";
  onClose?:  () => void;
  /** Called after successful auth. orgName provided when isOwner = true. Setup flow returns doneUrl. */
  onDone?:   (result?: { orgName?: string }) => Promise<{ doneUrl?: string } | void> | void;
  /**
   * Setup flow only. Called after email + name collected, before codeword screen.
   * AuthGate skips its own sendCodeword call and proceeds straight to org/codeword screen.
   */
  onBeforeSend?: (email: string, firstName: string) => Promise<{ ownerSlug: string; thingSlug: string } | { error: string }>;
  /**
   * Setup flow only. If provided, AuthGate shows a done screen after successful auth
   * instead of calling onDone immediately.
   */
  doneUrl?: string;
  /** Thing name for done screen headline */
  doneName?: string;
}

type Screen   = "email" | "org" | "code" | "done";
type BtnState = "idle" | "verifying" | "success" | "error";

export default function AuthGate({
  thingId, thingName, ownerSlug, thingSlug,
  isOwner = false,
  context = "booker",
  onClose,
  onDone,
  onBeforeSend,
  doneUrl,
  doneName,
}: AuthGateProps) {
  const router = useRouter();

  const [screen, setScreen]               = useState<Screen>("email");
  const [email, setEmail]                 = useState("");
  const [firstName, setFirstName]         = useState("");
  const [orgName, setOrgName]             = useState("My Organisation");
  const [code, setCode]                   = useState("");
  const [copied, setCopied]               = useState(false);
  const [localDoneUrl, setLocalDoneUrl]   = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [shake, setShake]                 = useState(false);
  const [btnState, setBtnState]           = useState<BtnState>("idle");
  const [filledSegs, setFilledSegs]       = useState(0);
  const [progressCopy, setProgressCopy]   = useState(STAGES[0].copy);
  const [progressVisible, setProgressVisible] = useState(true);
  const progressMounted = useRef(false);

  // ── Read stored name on mount ─────────────────────────────────────────────
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("bookerName") : null;
    if (stored) setFirstName(stored);
  }, []);

  // ── Scrape org name from email domain ─────────────────────────────────────
  useEffect(() => {
    if (email.includes("@")) setOrgName(extractOrgName(email));
  }, [email]);

  // ── Progress animation — runs on codeword screen ──────────────────────────
  // Segs 1 + 2 fill and stay. Seg 3 wipes completely and refills on loop.
  useEffect(() => {
    if (screen !== "code") return;
    progressMounted.current = true;
    let stage = 0;

    function fadeCopy(text: string, cb: () => void) {
      if (!progressMounted.current) return;
      setProgressVisible(false);
      setTimeout(() => {
        if (!progressMounted.current) return;
        setProgressCopy(text);
        setProgressVisible(true);
        cb();
      }, 220);
    }

    function fillSeg(idx: number, cb: () => void) {
      if (!progressMounted.current) return;
      setFilledSegs(idx + 1);
      setTimeout(cb, 600);
    }

    function loopSeg3() {
      if (!progressMounted.current) return;
      setFilledSegs(2); // wipe seg 3 completely — keep 1 + 2
      setTimeout(() => {
        if (!progressMounted.current) return;
        fillSeg(2, () => setTimeout(loopSeg3, 2200));
      }, 600);
    }

    function run() {
      if (!progressMounted.current || stage >= STAGES.length) {
        setTimeout(loopSeg3, 2200);
        return;
      }
      fadeCopy(STAGES[stage].copy, () =>
        fillSeg(stage, () => { stage++; setTimeout(run, 400); })
      );
    }

    const t = setTimeout(run, 400);
    return () => {
      progressMounted.current = false;
      clearTimeout(t);
    };
  }, [screen]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validEmail = email.trim().includes("@") && email.trim().includes(".");
  const validName  = firstName.trim().length >= 1;
  const validOrg   = orgName.trim().length >= 1;
  const validCode  = code.trim().length >= 3;

  // ── Step 1: send codeword ─────────────────────────────────────────────────
  async function handleSend() {
    if (!validEmail || !validName || loading) return;
    setLoading(true);
    setError(null);

    if (onBeforeSend) {
      const result = await onBeforeSend(email.trim(), firstName.trim());
      setLoading(false);
      if ("error" in result) { setError(result.error); return; }
    } else {
      const base = { email: email.trim(), firstName: firstName.trim() };
      const result =
        context === "booker"
          ? await sendCodeword({ context: "booker", ...base, thingId: thingId!, thingName: thingName!, ownerSlug: ownerSlug!, thingSlug: thingSlug! })
        : context === "setup"
          ? await sendCodeword({ context: "setup",  ...base, ownerSlug: ownerSlug!, thingSlug: thingSlug! })
          : await sendCodeword({ context: "manage", ...base });

      setLoading(false);
      if ("error" in result) { setError(result.error); return; }
    }

    setScreen(isOwner ? "org" : "code");
  }

  // ── Step 2 (owners only): proceed to codeword ─────────────────────────────
  function handleOrg() {
    if (!validOrg) return;
    setScreen("code");
  }

  // ── Step 3: verify codeword ───────────────────────────────────────────────
  async function handleVerify() {
    if (!validCode || btnState !== "idle") return;
    setBtnState("verifying");
    setError(null);

    const result = await verifyCodeword({
      email:   email.trim(),
      code:    code.trim().toUpperCase(),
      context: context as "booker" | "manage" | "setup",
    });

    if ("error" in result) {
      setBtnState("error");
      setShake(true);
      setTimeout(() => { setShake(false); setBtnState("idle"); }, 1200);
      return;
    }

    if (context !== "setup") {
      await setBookerSessionCookie(email.trim(), firstName.trim(), ownerSlug ?? "", thingId ?? "");
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("bookerName",  firstName.trim());
      localStorage.setItem("bookerEmail", email.trim().toLowerCase());
    }

    setBtnState("success");
    router.refresh();

    setTimeout(async () => {
      const result = await onDone?.({ orgName: isOwner ? orgName.trim() : undefined });
      if (context === "setup") {
        const url = (result as { doneUrl?: string } | void)?.doneUrl;
        if (url) {
          setLocalDoneUrl(url);
          setScreen("done");
        }
      }
    }, 650);
  }

  // ── Copy URL ──────────────────────────────────────────────────────────────
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(localDoneUrl ?? ""); } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Step badge ────────────────────────────────────────────────────────────
  const stepBadgeContent = screen === "done"
    ? <Check size={14} strokeWidth={2.5} color={WHITE} />
    : screen === "email" ? 1 : screen === "org" ? 2 : isOwner ? 3 : 2;

  // ── Shared styles ─────────────────────────────────────────────────────────
  const fieldStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 11,
    border: `2px solid ${BORDER}`, background: WHITE,
    fontSize: SIZE_SM, fontWeight: W_REGULAR, fontFamily: SYS,
    color: DARK,
    marginBottom: 10, boxSizing: "border-box" as const,
  };

  const primaryBtn = {
    width: "100%", padding: 14, borderRadius: 12, border: "none",
    background: ORANGE, color: WHITE,
    fontSize: 14, fontWeight: W_BOLD, fontFamily: SYS,
    cursor: "pointer", marginBottom: 12,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
  } as const;

  return (
    <ModalShell onBackdropClick={screen === "done" ? undefined : onClose}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60%  { transform: translateX(-6px); }
          40%,80%  { transform: translateX(6px); }
        }
        @keyframes screenIn {
          from { opacity: 0; transform: scale(0.97); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes lockTick {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.35); }
          70%  { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .gate-shake { animation: shake 0.4s ease; }
        .gate-input:focus { outline: none; border-color: ${ORANGE} !important; }
        .gate-input::placeholder { font-style: normal; }
        .gate-cta { transition: opacity 0.15s, transform 0.15s; }
        .gate-cta:active { opacity: 0.88 !important; transform: scale(0.99); }
        .seg-bar {
          height: 100%; width: 100%; border-radius: 4px;
          background: ${ORANGE}; transform-origin: left;
          transition: transform 0.55s cubic-bezier(0.32,0.72,0,1);
        }
      `}</style>

      {/* ── Step badge ── */}
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        background: ORANGE, color: WHITE,
        fontSize: SIZE_SM, fontWeight: W_BOLD, fontFamily: SYS,
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 14, flexShrink: 0,
      }}>
        {stepBadgeContent}
      </div>

      {/* ══════════ SCREEN 1 — EMAIL + NAME ══════════ */}
      {screen === "email" && (
        <div style={{ animation: "screenIn 0.2s cubic-bezier(0.32,0.72,0,1) forwards" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: SIZE_LG, fontWeight: W_BOLD, color: DARK, letterSpacing: "-0.4px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 6 }}>
              Quick security check
            </div>
            <div style={{ fontSize: SIZE_SM, color: GREY, fontFamily: SYS, lineHeight: 1.5 }}>
              So we know you're really you.
            </div>
          </div>

          <input
            className="gate-input"
            type="email" autoFocus
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null); }}
            onKeyDown={e => e.key === "Enter" && document.getElementById("gate-name")?.focus()}
            placeholder="What's your email?"
            style={{ ...fieldStyle, color: email ? DARK : GREY_LIGHT }}
          />
          <input
            id="gate-name"
            className="gate-input"
            type="text" maxLength={20}
            value={firstName}
            onChange={e => { setFirstName(e.target.value.slice(0, 20)); setError(null); }}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="What's your first name?"
            style={{ ...fieldStyle, marginBottom: 4, color: firstName ? DARK : GREY_LIGHT }}
          />

          {error && (
            <div style={{ fontSize: 12, color: RED_ERRORTOAST, fontFamily: SYS, marginBottom: 10, marginTop: 4 }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 20 }} />

          <button
            className="gate-cta"
            onClick={handleSend}
            disabled={!validEmail || !validName || loading}
            style={{
              ...primaryBtn,
              background: validEmail && validName ? ORANGE : ORANGE_MID,
              color:      validEmail && validName ? WHITE : ORANGE,
              cursor:     validEmail && validName ? "pointer" : "default",
            }}
          >
            {loading ? "Sending…" : "Get a codeword"}
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            We won't spam you, promise.
          </div>
        </div>
      )}

      {/* ══════════ SCREEN 2 — ORG (owners only) ══════════ */}
      {screen === "org" && (
        <div style={{ animation: "screenIn 0.2s cubic-bezier(0.32,0.72,0,1) forwards" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: SIZE_LG, fontWeight: W_BOLD, color: DARK, letterSpacing: "-0.4px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 6 }}>
              Whose calendar is it?
            </div>
            <div style={{ fontSize: SIZE_SM, color: GREY, fontFamily: SYS, lineHeight: 1.5 }}>
              So people can easily find you.
            </div>
          </div>

          <input
            className="gate-input"
            type="text" autoFocus maxLength={40}
            value={orgName}
            onChange={e => setOrgName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleOrg()}
            placeholder="eg: Hunch"
            style={{
              ...fieldStyle,
              color:     orgName === "My Organisation" ? GREY_LIGHT : DARK,
              fontStyle: "normal",
              marginBottom: 20,
            }}
          />

          <div>
            <div style={{
              fontSize: 9, fontWeight: W_BOLD, letterSpacing: "1px",
              textTransform: "uppercase", color: ORANGE,
              fontFamily: SYS, marginBottom: 5,
            }}>
              Remember
            </div>
            <div style={{ fontSize: 12, color: GREY, fontFamily: SYS, lineHeight: 1.6 }}>
              Your things, your rules. We just handle the bookings.
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 20 }} />

          <button className="gate-cta" onClick={handleOrg} style={primaryBtn}>
            Nearly done
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            You can change this any time.
          </div>
        </div>
      )}

      {/* ══════════ SCREEN 3 — CODEWORD ══════════ */}
      {screen === "code" && (
        <div style={{ animation: "screenIn 0.2s cubic-bezier(0.32,0.72,0,1) forwards" }}>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: SIZE_LG, fontWeight: W_BOLD, color: DARK, letterSpacing: "-0.4px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 6 }}>
              Pop in your codeword
            </div>
            <div style={{ fontSize: SIZE_SM, color: GREY, fontFamily: SYS }}>
              We've sent it to your email.
            </div>
          </div>

          <div className={shake ? "gate-shake" : ""}>
            <input
              className="gate-input"
              type="text" autoFocus maxLength={10}
              value={code}
              onChange={e => {
                setCode(e.target.value.toUpperCase());
                setError(null);
                if (btnState === "error") setBtnState("idle");
              }}
              onKeyDown={e => e.key === "Enter" && handleVerify()}
              placeholder="CODEWORD"
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 11,
                border: `2px solid ${error ? ORANGE : BORDER}`,
                background: error ? ORANGE_LIGHT : WHITE,
                textAlign: "center",
                fontSize: 22, fontWeight: W_BOLD, fontFamily: SYS,
                color: error ? RED_ERRORTOAST : DARK,
                letterSpacing: "4px", marginBottom: 14,
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: 4 }}>
            <div style={{
              fontSize: SIZE_XS, fontWeight: W_BOLD, letterSpacing: "0.8px",
              textTransform: "uppercase", color: GREY, fontFamily: SYS,
              marginBottom: 7,
              opacity: progressVisible ? 1 : 0,
              transition: "opacity 0.22s ease",
            }}>
              {progressCopy}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 4, background: BACKGROUND, overflow: "hidden" }}>
                  <div className="seg-bar" style={{ transform: filledSegs > i ? "scaleX(1)" : "scaleX(0)" }} />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 12, color: RED_ERRORTOAST, fontFamily: SYS, marginTop: 8, textAlign: "center" }}>
              {error}
            </div>
          )}

          <div style={{ flex: 1, minHeight: 20 }} />

          <button
            className="gate-cta"
            onClick={handleVerify}
            disabled={!validCode || btnState !== "idle"}
            style={{
              ...primaryBtn,
              opacity: btnState === "verifying" ? 0.8 : 1,
              cursor:  validCode && btnState === "idle" ? "pointer" : "default",
            }}
          >
            {btnState === "idle" && (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Unlock
              </>
            )}
            {btnState === "verifying" && (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ animation: "spin 0.9s linear infinite" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                Double checking…
              </>
            )}
            {btnState === "success" && (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ animation: "lockTick 0.4s cubic-bezier(0.32,0.72,0,1) forwards" }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                You're in
              </>
            )}
            {btnState === "error" && (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Try again
              </>
            )}
          </button>

          <div style={{ textAlign: "center", fontSize: 12, color: "#ccc", fontFamily: SYS }}>
            Didn't get it?{" "}
            <span
              onClick={() => { setScreen("email"); setCode(""); setError(null); setBtnState("idle"); setFilledSegs(0); }}
              style={{ color: ORANGE, fontWeight: W_MEDIUM, cursor: "pointer" }}
            >
              Send another
            </span>
          </div>
        </div>
      )}

      {/* ══════════ SCREEN 4 — DONE (setup flow only) ══════════ */}
      {screen === "done" && (
        <div style={{ animation: "screenIn 0.2s cubic-bezier(0.32,0.72,0,1) forwards" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: SIZE_LG, fontWeight: W_BOLD, color: DARK, letterSpacing: "-0.4px", fontFamily: SYS, lineHeight: 1.2, marginBottom: 6 }}>
              "{doneName}" is live
            </div>
            <div style={{ fontSize: SIZE_SM, color: GREY, fontFamily: SYS, lineHeight: 1.5 }}>
              Share the link below. Anyone can use it to book.
            </div>
          </div>

          <div style={{ background: ORANGE_LIGHT, borderRadius: "12px", padding: "14px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, fontSize: SIZE_SM, fontWeight: W_MEDIUM, color: GREY, fontFamily: SYS, wordBreak: "break-all", maxWidth: "calc(100% - 80px)" }}>
              {localDoneUrl}
            </div>
            <button
              onClick={handleCopy}
              style={{
                background: ORANGE, border: "none", cursor: "pointer",
                borderRadius: "8px", padding: "8px 12px", color: WHITE,
                fontSize: 12, fontWeight: W_BOLD, fontFamily: SYS, flexShrink: 0,
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <button
            onClick={() => { if (localDoneUrl) window.location.href = localDoneUrl; }}
            style={{
              ...primaryBtn,
              marginBottom: 0,
            }}
          >
            Go book some things
          </button>
        </div>
      )}
    </ModalShell>
  );
}
