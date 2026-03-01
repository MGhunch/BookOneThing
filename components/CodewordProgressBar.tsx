"use client";

import { useState, useEffect } from "react";

import { ORANGE, GREY, BORDER, SIZE_SM, W_MEDIUM } from "@/lib/constants";

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

// ── Exported component ────────────────────────────────────────────────────────
// Steps bar with staged copy.
// Third segment pulses on a loop — signals "we've done our bit,
// the internet is doing its thing."

export function CodewordProgressBar({ resetKey }: { resetKey: number }) {
  const { label, stage } = useStagedText(resetKey);
  const { display, visible } = useFadingLabel(label);
  const filled = stage + 1;

  return (
    <div style={{ marginBottom: 20 }}>
      <style>{`
        @keyframes bot-seg-fill {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
        @keyframes bot-seg-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .bot-seg-fill  { transform-origin: left; animation: bot-seg-fill 0.4s cubic-bezier(0.32,0.72,0,1); }
        .bot-seg-pulse { animation: bot-seg-pulse 1.4s ease-in-out infinite; }
      `}</style>
      <div style={{
        fontSize: SIZE_SM, fontWeight: W_MEDIUM, color: GREY, fontFamily: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
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
                  key={`bot-seg-${i}-${filled}`}
                  className={isLooping ? "bot-seg-pulse" : "bot-seg-fill"}
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
