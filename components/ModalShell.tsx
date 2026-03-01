"use client";

import { useEffect } from "react";
import { WHITE, BACKGROUND } from "@/lib/constants";

interface ModalShellProps {
  children: React.ReactNode;
  onBackdropClick?: () => void;
  /** Extra bottom padding for mobile safe area. Default 48px. */
  bottomPad?: number;
}

export default function ModalShell({ children, onBackdropClick, bottomPad = 48 }: ModalShellProps) {
  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <>
      <style>{`
        @keyframes modalSlideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes modalFadeIn {
          from { transform: translateY(12px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0)    scale(1);    opacity: 1; }
        }
        @media (min-width: 768px) {
          .modal-sheet {
            border-radius: 24px !important;
            margin: auto !important;
            max-width: 480px !important;
            animation: modalFadeIn 0.25s cubic-bezier(0.32,0.72,0,1) forwards !important;
          }
          .modal-handle { display: none !important; }
          .modal-outer  { align-items: center !important; justify-content: center !important; }
        }
      `}</style>

      {/* Outer — full screen backdrop */}
      <div
        className="modal-outer"
        onClick={onBackdropClick}
        style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", flexDirection: "column",
          alignItems: "stretch", justifyContent: "flex-end",
          background: "rgba(26,26,26,0.35)",
          backdropFilter: "blur(1px)",
        }}
      >
        {/* Sheet */}
        <div
          className="modal-sheet"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          onTouchEnd={e => e.stopPropagation()}
          style={{
            position: "relative",
            background: WHITE,
            borderRadius: "24px 24px 0 0",
            padding: `32px 28px ${bottomPad}px`,
            width: "100%",
            boxShadow: "0 -8px 48px rgba(0,0,0,0.12)",
            animation: "modalSlideUp 0.35s cubic-bezier(0.32,0.72,0,1) forwards",
          }}
        >
          {/* Drag handle — hidden on desktop via CSS */}
          <div
            className="modal-handle"
            style={{
              width: "36px", height: "4px", borderRadius: "2px",
              background: BACKGROUND, margin: "0 auto 28px",
            }}
          />
          {children}
        </div>
      </div>
    </>
  );
}
