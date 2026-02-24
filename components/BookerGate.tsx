"use client";

import { useState } from "react";
import { sendGateMagicLink } from "@/app/[slug]/gate-actions";
import ModalShell from "@/components/ModalShell";

const ORANGE = "#e8722a";
const SYS    = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";

interface BookerGateProps {
  thingId:   string;
  thingName: string;
  slug:      string;
}

export default function BookerGate({ thingId, thingName, slug }: BookerGateProps) {
  const [email, setEmail]           = useState("");
  const [firstName, setFirstName]   = useState("");
  const [sent, setSent]             = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const canSubmit =
    email.trim().includes("@") &&
    email.trim().includes(".") &&
    firstName.trim().length > 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = await sendGateMagicLink({
      email,
      firstName,
      thingId,
      thingName,
      slug,
      origin: window.location.origin,
    });

    setSubmitting(false);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSent(true);
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
          {/* Heading */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", marginBottom: "6px" }}>
              Before you book…
            </div>
            <div style={{ fontSize: "13px", color: "#aaa", lineHeight: 1.6 }}>
              We just need to know two things.
            </div>
          </div>

          {/* Fields */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            <div>
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
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: "11px", color: "#ccc", marginTop: "5px", paddingLeft: "2px" }}>
                To confirm you're really you.
              </div>
            </div>

            <div>
              <input
                className="gate-input"
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={{
                  width: "100%", padding: "14px 16px", borderRadius: "12px",
                  border: "1.5px solid #ede9e3", fontSize: "15px", fontWeight: 500,
                  fontFamily: SYS, color: "#1a1a1a", background: "#fff",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: "11px", color: "#ccc", marginTop: "5px", paddingLeft: "2px" }}>
                So you know who's who in the calendar.
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ fontSize: "13px", color: "#c0392b", marginBottom: "12px", paddingLeft: "2px" }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            style={{
              width: "100%", padding: "15px", borderRadius: "14px", border: "none",
              background: canSubmit ? "#1a1a1a" : "#f0ece6",
              color: canSubmit ? "#fff" : "#bbb",
              fontSize: "15px", fontWeight: 600, fontFamily: SYS,
              cursor: canSubmit ? "pointer" : "default",
              transition: "all 0.15s",
              marginBottom: "14px",
            }}
          >
            {submitting ? "Sending…" : "That's me →"}
          </button>

          <div style={{ textAlign: "center", fontSize: "12px", color: "#ccc" }}>
            No password. No account. Just a link.
          </div>
        </>
      ) : (
        /* Sent state */
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "50%",
            background: ORANGE,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="3"/>
              <polyline points="2,4 12,14 22,4"/>
            </svg>
          </div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", marginBottom: "10px" }}>
            Check your inbox.
          </div>
          <div style={{ fontSize: "14px", color: "#aaa", lineHeight: 1.6, maxWidth: "280px", margin: "0 auto" }}>
            Just tap the link in your email to unlock the calendar.
          </div>
        </div>
      )}
    </ModalShell>
  );
}
