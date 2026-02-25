"use client";

import { useState } from "react";
import { sendGateMagicLink } from "@/app/[owner-slug]/[thing-slug]/gate-actions";
import ModalShell from "@/components/ModalShell";

const ORANGE = "#e8722a";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

interface BookerGateProps {
  thingId:   string;
  thingName: string;
  ownerSlug: string;
  thingSlug: string;
}

export default function BookerGate({ thingId, thingName, ownerSlug, thingSlug }: BookerGateProps) {
  const [email, setEmail]           = useState("");
  const [sent, setSent]             = useState(false);
  const [dismissed, setDismissed]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [showToast, setShowToast]   = useState(false);

  const canSubmit =
    email.trim().includes("@") &&
    email.trim().includes(".") &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = await sendGateMagicLink({ email, thingId, thingName, ownerSlug, thingSlug });

    setSubmitting(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSent(true);
  }

  function handleDismiss() {
    setDismissed(true);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  }

  if (dismissed) {
    return (
      <>
        <style>{`
          @keyframes toastIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes toastOut {
            from { opacity: 1; }
            to   { opacity: 0; }
          }
        `}</style>
        {showToast && (
          <div style={{
            position: "fixed", bottom: "96px", left: "50%", transform: "translateX(-50%)",
            background: "#1a1a1a", color: "#fff",
            padding: "12px 20px", borderRadius: "12px",
            fontSize: "13px", fontWeight: 500, fontFamily: SYS,
            whiteSpace: "nowrap", zIndex: 200,
            animation: "toastIn 0.25s ease forwards",
            boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          }}>
            Just click the email link to unlock bookings
          </div>
        )}
      </>
    );
  }

  return (
    <ModalShell>
      <style>{`
        .gate-input:focus {
          outline: none;
          border-color: ${ORANGE} !important;
        }
      `}</style>

      {!sent ? (
        <>
          <div style={{ marginBottom: "20px" }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: ORANGE,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/>
                <path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/>
                <path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/>
              </svg>
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", lineHeight: 1.25, marginBottom: "20px" }}>
              Grab a magic link<br/>and crack into it
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <input
              className="gate-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              style={{
                width: "100%", padding: "14px 16px", borderRadius: "12px",
                border: "1.5px solid #ede9e3", fontSize: "15px", fontWeight: 500,
                fontFamily: SYS, color: "#1a1a1a", background: "#fff",
                boxSizing: "border-box" as const,
              }}
            />
            <div style={{ fontSize: "11px", color: "#ccc", marginTop: "5px", paddingLeft: "2px" }}>
            </div>
          </div>

          {error && (
            <div style={{ fontSize: "13px", color: "#c0392b", marginBottom: "12px", paddingLeft: "2px" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: "100%", padding: "15px", borderRadius: "14px", border: "none",
              background: canSubmit ? ORANGE : "#f0ece6",
              color: canSubmit ? "#fff" : "#bbb",
              fontSize: "15px", fontWeight: 600, fontFamily: SYS,
              cursor: canSubmit ? "pointer" : "default",
              transition: "all 0.15s",
              marginBottom: "14px",
            }}
          >
            {submitting ? "Sending…" : "Let's go"}
          </button>

          <div style={{ textAlign: "center", fontSize: "12px", color: "#ccc" }}>
            No pesky passwords, ever.
          </div>
        </>
      ) : (
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "50%",
            background: ORANGE,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,11 8,17 19,5"/>
            </svg>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", marginBottom: "10px" }}>
            On its way
          </div>
          <div style={{ fontSize: "14px", color: "#aaa", lineHeight: 1.65, maxWidth: "260px", margin: "0 auto 28px" }}>
            May take a minute. Click the link in your email and you're cooking.
          </div>
          <button
            onClick={handleDismiss}
            style={{
              padding: "12px 32px", borderRadius: "12px",
              border: "1.5px solid #ede9e3", background: "#fff",
              fontSize: "14px", fontWeight: 600, color: "#888",
              fontFamily: SYS, cursor: "pointer",
            }}
          >
            Got it
          </button>
        </div>
      )}
    </ModalShell>
  );
}
