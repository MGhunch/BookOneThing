"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  Check,
  Car,
  Users,
  Coffee,
  Sun,
} from "lucide-react";
import type { Thing, Booking } from "@/types";

const SYS = "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif";
const ORANGE = "#e8722a";
const ORANGE_BOOKED = "#f2c9a8";
const ORANGE_AVAIL = "#fdf4ee";
const ORANGE_SEL = "#fbe0cc";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const FULL_DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const ICON_MAP: Record<string, React.ComponentType<{ size: number; strokeWidth: number; color: string }>> = {
  car: Car,
  users: Users,
  coffee: Coffee,
  sun: Sun,
};

const H_DEFAULT = "default";
const H_PICKING = "picking";
const H_CONFIRM = "confirm";

const SLOT_H_HALF = 36;
const SLOT_H_FULL = 60;
const HAIRLINE = 1;
const PILL_GAP = 5;

function fmtHour(n: number) {
  if (n === 0) return "12am";
  if (n < 12) return `${n}am`;
  if (n === 12) return "12pm";
  return `${n - 12}pm`;
}

function fmtSlot(s: string) {
  if (!s) return "";
  const [h, m] = s.split(":");
  const n = parseInt(h);
  const base = n === 0 ? "12" : n <= 12 ? `${n}` : `${n - 12}`;
  const suffix = n < 12 ? "am" : "pm";
  return m === "30" ? `${base}:30${suffix}` : `${base}${suffix}`;
}

function getWeekDates(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function TickRow({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Check size={9} strokeWidth={3} color="#fff" />
      </div>
      <span style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", fontFamily: SYS, letterSpacing: "-0.2px" }}>
        {label}
      </span>
    </div>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div style={{
      position: "fixed", bottom: "48px", left: "50%",
      transform: `translateX(-50%) translateY(${visible ? 0 : 12}px)`,
      opacity: visible ? 1 : 0, transition: "all 0.2s ease",
      background: "rgba(26,26,26,0.88)", color: "#fff",
      fontSize: "13px", fontWeight: 600, fontFamily: SYS,
      padding: "10px 20px", borderRadius: "24px",
      pointerEvents: "none", zIndex: 300, whiteSpace: "nowrap",
    }}>
      {message}
    </div>
  );
}

interface CalendarProps {
  thing: Thing;
  bookings: Booking[];
  slug: string;
}

export default function Calendar({ thing, bookings }: CalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );
  const [halfHour, setHalfHour] = useState(true);
  const [selection, setSelection] = useState<{ start: string; end?: string } | null>(null);
  const [headerState, setHeaderState] = useState(H_DEFAULT);
  const [modal, setModal] = useState<{ type: string; start?: string; end?: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const [bookerName, setBookerName] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);
  const [calH, setCalH] = useState(300);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ThingIcon = ICON_MAP[thing.icon] || Car;
  const SLOT_H = halfHour ? SLOT_H_HALF : SLOT_H_FULL;
  const dates = getWeekDates(weekOffset);
  const selDate = dates[selectedDay];

  // Build booking map from props
  const bookingMap: Record<string, string> = {};
  bookings.forEach((b) => {
    if (!b.cancelled_at) {
      // TODO: expand ISO ranges into slot strings when wired to DB
    }
  });

  // Hardcoded demo bookings for now
  const DEMO_MAP: Record<string, string> = {
    "9:00": "Peter", "9:30": "Peter", "10:00": "Peter",
    "14:00": "Sarah", "14:30": "Sarah",
  };
  const YOURS: string[] = ["11:00", "11:30"];
  const MY_NAME = bookerName || "You";

  const allSlots: string[] = [];
  for (let h = 0; h < 24; h++) {
    allSlots.push(`${h}:00`);
    if (halfHour) allSlots.push(`${h}:30`);
  }

  function slotY(i: number) {
    if (halfHour) return Math.floor(i / 2) * (2 * SLOT_H + HAIRLINE + PILL_GAP) + (i % 2) * (SLOT_H + HAIRLINE);
    return i * (SLOT_H + PILL_GAP);
  }
  const totalH = halfHour ? 24 * (2 * SLOT_H + HAIRLINE + PILL_GAP) : 24 * (SLOT_H + PILL_GAP);

  useEffect(() => {
    // Load booker name from localStorage
    const stored = localStorage.getItem("bookerName");
    if (stored) setBookerName(stored);
  }, []);

  useEffect(() => {
    if (!calendarRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setCalH(e.contentRect.height);
    });
    ro.observe(calendarRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    const idx = halfHour ? 18 : 9; // scroll to 9am
    scrollRef.current.scrollTop = Math.max(0, slotY(idx) - calH / 2 + SLOT_H);
  }, [halfHour, calH]);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, message: msg });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2000);
  }, []);

  const clearSelection = () => { setSelection(null); setHeaderState(H_DEFAULT); };
  const slotIdx = (h: string) => allSlots.indexOf(h);

  const inRange = (h: string) => {
    if (!selection?.start || !selection?.end) return false;
    const si = slotIdx(selection.start);
    const ei = slotIdx(selection.end);
    return slotIdx(h) >= Math.min(si, ei) && slotIdx(h) <= Math.max(si, ei);
  };

  const hasConflict = (a: string, b: string) => {
    const lo = Math.min(slotIdx(a), slotIdx(b));
    const hi = Math.max(slotIdx(a), slotIdx(b));
    return allSlots.slice(lo, hi + 1).some((h) => DEMO_MAP[h] || YOURS.includes(h));
  };

  const handleSlot = (h: string) => {
    if (DEMO_MAP[h]) { showToast("Sorry, not available."); return; }
    if (YOURS.includes(h)) { clearSelection(); setModal({ type: "cancel", start: h, end: h }); return; }
    if (!selection) { setSelection({ start: h }); setHeaderState(H_PICKING); return; }
    if (selection.start && !selection.end) {
      if (h === selection.start) { setSelection({ start: h, end: h }); setHeaderState(H_CONFIRM); return; }
      if (hasConflict(selection.start, h)) { showToast("Sorry, not available."); setSelection({ start: h }); setHeaderState(H_PICKING); return; }
      const lo = Math.min(slotIdx(selection.start), slotIdx(h));
      const hi = Math.max(slotIdx(selection.start), slotIdx(h));
      setSelection({ start: allSlots[lo], end: allSlots[hi] });
      setHeaderState(H_CONFIRM);
      return;
    }
    clearSelection(); setSelection({ start: h }); setHeaderState(H_PICKING);
  };

  const handleBook = () => {
    setConfirmed(false);
    setModal({ type: "book", start: selection!.start, end: selection!.end });
    setSelection(null); setHeaderState(H_DEFAULT);
  };

  const isActive = (h: string) => inRange(h) || (selection?.start === h && !selection?.end);
  const slotBg = (h: string) => isActive(h) ? ORANGE_SEL : ORANGE_AVAIL;

  const timeStr = selection
    ? (!selection.end || selection.start === selection.end)
      ? fmtSlot(selection.start)
      : `${fmtSlot(selection.start)} – ${fmtSlot(selection.end!)}`
    : "";

  const slotLabel = (slot: string) => {
    if (!selection) return null;
    const isStart = selection.start === slot;
    const isEnd = selection.end === slot && selection.start !== selection.end;
    if (isStart) return <span style={{ fontSize: "11px", fontWeight: 600, color: ORANGE, fontFamily: SYS }}>From {fmtSlot(selection.start)}</span>;
    if (selection.end && isEnd) return <span style={{ fontSize: "11px", fontWeight: 500, color: "rgba(232,114,42,0.65)", fontFamily: SYS }}>Until {fmtSlot(selection.end)}</span>;
    return null;
  };

  function buildGroups() {
    const groups: { type: string; name?: string; startIdx: number; endIdx: number; s1?: string; s2?: string; slot?: string }[] = [];
    let i = 0;
    while (i < allSlots.length) {
      const slot = allSlots[i];
      const name = DEMO_MAP[slot];
      const yours = YOURS.includes(slot);
      if (name) {
        let j = i;
        while (j < allSlots.length && DEMO_MAP[allSlots[j]] === name) j++;
        groups.push({ type: "booking", name, startIdx: i, endIdx: j - 1 });
        i = j;
      } else if (yours) {
        let j = i;
        while (j < allSlots.length && YOURS.includes(allSlots[j])) j++;
        groups.push({ type: "yours", startIdx: i, endIdx: j - 1 });
        i = j;
      } else if (halfHour) {
        const next = allSlots[i + 1];
        const sameHour = next && slot.split(":")[0] === next.split(":")[0];
        if (sameHour && !DEMO_MAP[next] && !YOURS.includes(next)) {
          groups.push({ type: "pill", startIdx: i, endIdx: i + 1, s1: slot, s2: next });
          i += 2;
        } else {
          groups.push({ type: "half", startIdx: i, endIdx: i, slot });
          i++;
        }
      } else {
        groups.push({ type: "single", startIdx: i, endIdx: i, slot });
        i++;
      }
    }
    return groups;
  }

  const groups = buildGroups();
  const groupH = (si: number, ei: number) => slotY(ei) + SLOT_H - slotY(si);

  const atStart = false;
  const atEnd = false;

  return (
    <div style={{
      minHeight: "100vh", background: "#e8e5e0", fontFamily: SYS,
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "flex-start", padding: "48px 16px",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
        *::-webkit-scrollbar { display:none; }
      `}</style>

      {/* Phone frame */}
      <div style={{ position: "relative", width: "390px", maxWidth: "100%", height: "844px", flexShrink: 0 }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "48px", overflow: "hidden", background: "#f5f4f0", display: "flex", flexDirection: "column" }}>

          {/* Logo bar */}
          <div style={{ flexShrink: 0, padding: "52px 22px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                <div style={{ width: "26px", height: "26px", borderRadius: "8px", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: "9px", height: "9px", borderRadius: "50%", border: "2px solid #fff" }} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.5px", fontFamily: SYS }}>
                  book<span style={{ fontWeight: 300 }}>one</span>thing
                </span>
              </div>
              <span style={{ fontSize: "12px", color: "#bbb", fontWeight: 500, fontFamily: SYS }}>Harbour Works</span>
            </div>
          </div>

          {/* Card */}
          <div style={{ flex: 1, margin: "0 14px", minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, minHeight: 0, background: "#fff", borderRadius: "22px", boxShadow: "0 4px 28px rgba(0,0,0,0.07)", overflow: "hidden", display: "flex", flexDirection: "column" }}>

              {/* Card header */}
              <div style={{ flexShrink: 0, padding: "18px 20px 0" }}>

                {/* Thing title */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ThingIcon size={16} strokeWidth={1.75} color="#fff" />
                  </div>
                  <span style={{ fontSize: "19px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", fontFamily: SYS, flex: 1 }}>
                    {thing.name}
                  </span>
                  {headerState === H_DEFAULT && (
                    <button onClick={() => setModal({ type: "info" })} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc" }}>
                      <Info size={14} strokeWidth={1.75} />
                    </button>
                  )}
                </div>

                {/* Day strip */}
                {headerState === H_DEFAULT && (
                  <div style={{ display: "grid", gridTemplateColumns: "16px 1fr 1fr 1fr 1fr 1fr 1fr 1fr 16px", gap: "1px", alignItems: "center", marginBottom: "12px" }}>
                    <button onClick={() => setWeekOffset((w) => w - 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "#ccc", padding: 0 }}>‹</button>
                    {DAYS.map((day, i) => {
                      const d = dates[i];
                      const sel = i === selectedDay;
                      const today = d.toDateString() === new Date().toDateString();
                      return (
                        <button key={day} onClick={() => { setSelectedDay(i); clearSelection(); }} style={{ background: sel ? "#1a1a1a" : "transparent", border: "none", borderRadius: "8px", padding: "6px 1px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                          <span style={{ fontSize: "8px", fontWeight: 600, letterSpacing: "0.4px", textTransform: "uppercase", color: sel ? "#888" : "#ccc", fontFamily: SYS }}>{day}</span>
                          <span style={{ fontSize: "14px", fontWeight: today ? 800 : sel ? 700 : 400, color: sel ? "#fff" : today ? "#1a1a1a" : "#aaa", fontFamily: SYS }}>{d.getDate()}</span>
                          {today && !sel && <div style={{ width: "3px", height: "3px", borderRadius: "50%", background: ORANGE }} />}
                        </button>
                      );
                    })}
                    <button onClick={() => setWeekOffset((w) => w + 1)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "#ccc", padding: 0 }}>›</button>
                  </div>
                )}

                {/* Picking state */}
                {headerState === H_PICKING && (
                  <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", padding: "10px 0" }}>
                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Check size={9} strokeWidth={3} color="#fff" />
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 600, color: ORANGE, fontFamily: SYS }}>From {fmtSlot(selection?.start || "")}</span>
                  </div>
                )}

                {/* Confirm state */}
                {headerState === H_CONFIRM && (
                  <div style={{ marginBottom: "12px", display: "flex", alignItems: "stretch", gap: "12px", padding: "10px 0", animation: "fadeUp 0.2s ease" }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "10px", justifyContent: "center" }}>
                      <TickRow label={timeStr} />
                      <TickRow label={MY_NAME} />
                    </div>
                    <button onClick={handleBook} style={{ background: ORANGE, border: "none", borderRadius: "16px", padding: "0 22px", fontSize: "14px", fontWeight: 700, color: "#fff", fontFamily: SYS, cursor: "pointer", flexShrink: 0, minWidth: "92px", minHeight: "44px", display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "-0.2px" }}>
                      Book it
                    </button>
                  </div>
                )}

                {/* Date row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", paddingBottom: "14px", borderTop: "1px solid #f4f0eb" }}>
                  <span style={{ fontSize: "15px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.3px", fontFamily: SYS }}>
                    {FULL_DAYS[selectedDay]} {selDate.getDate()} {MONTHS[selDate.getMonth()]}
                  </span>
                  {headerState === H_DEFAULT && (
                    <div style={{ display: "flex", background: "#f2f0ec", borderRadius: "20px", padding: "3px", gap: "1px" }}>
                      {["30m", "1hr"].map((label, i) => {
                        const active = (i === 0 && halfHour) || (i === 1 && !halfHour);
                        return (
                          <button key={label} onClick={() => { setHalfHour(i === 0); clearSelection(); }} style={{ background: active ? "#1a1a1a" : "transparent", border: "none", borderRadius: "17px", padding: "4px 11px", cursor: "pointer", fontSize: "11px", fontWeight: active ? 700 : 500, color: active ? "#fff" : "#bbb", fontFamily: SYS }}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {headerState !== H_DEFAULT && (
                    <button onClick={clearSelection} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", padding: "4px" }}>
                      <X size={15} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>

              {/* Calendar scroll */}
              <div ref={calendarRef} style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
                <div ref={scrollRef} style={{ position: "absolute", inset: 0, overflowY: "scroll", overflowX: "hidden", padding: "10px 14px 10px 16px", scrollbarWidth: "none" }}>
                  <div style={{ position: "relative", height: `${totalH}px`, paddingLeft: "40px" }}>

                    {Array.from({ length: 24 }, (_, h) => {
                      const i = halfHour ? h * 2 : h;
                      return (
                        <div key={h} style={{ position: "absolute", left: 0, top: `${slotY(i)}px`, width: "36px", height: `${SLOT_H}px`, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                          <span style={{ fontSize: "10px", color: "#ccc", fontWeight: 500, fontFamily: SYS }}>{fmtHour(h)}</span>
                        </div>
                      );
                    })}

                    <div style={{ position: "absolute", left: "40px", right: 0, top: 0 }}>
                      {groups.map((group, gi) => {
                        const top = slotY(group.startIdx);
                        const height = groupH(group.startIdx, group.endIdx);

                        if (group.type === "booking") return (
                          <div key={gi} onClick={() => showToast("Sorry, not available.")} style={{ position: "absolute", top, left: 0, right: 0, height, background: ORANGE_BOOKED, borderRadius: "8px", display: "flex", alignItems: "center", paddingLeft: "11px", cursor: "pointer" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, color: "#c45a10", fontFamily: SYS }}>{group.name}</span>
                          </div>
                        );

                        if (group.type === "yours") return (
                          <button key={gi} onClick={() => handleSlot(allSlots[group.startIdx])} style={{ position: "absolute", top, left: 0, right: 0, height, background: ORANGE, borderRadius: "8px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: "11px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#fff", fontFamily: SYS }}>{MY_NAME} — tap to cancel</span>
                          </button>
                        );

                        if (group.type === "pill") {
                          const s1A = isActive(group.s1!);
                          const s2A = isActive(group.s2!);
                          const anyA = s1A || s2A;
                          return (
                            <div key={gi} style={{ position: "absolute", top, left: 0, right: 0, height, borderRadius: "8px", overflow: "hidden", border: anyA ? `2px solid ${ORANGE}` : "2px solid transparent", boxSizing: "border-box" }}>
                              <button onClick={() => handleSlot(group.s1!)} style={{ display: "flex", alignItems: "center", paddingLeft: "11px", width: "100%", height: `${SLOT_H}px`, background: slotBg(group.s1!), border: "none", borderBottom: `${HAIRLINE}px solid rgba(232,114,42,0.1)`, cursor: "pointer", boxSizing: "border-box", textAlign: "left" }}>
                                {slotLabel(group.s1!)}
                              </button>
                              <button onClick={() => handleSlot(group.s2!)} style={{ display: "flex", alignItems: "center", paddingLeft: "11px", width: "100%", height: `${SLOT_H}px`, background: slotBg(group.s2!), border: "none", cursor: "pointer", boxSizing: "border-box", textAlign: "left" }}>
                                {slotLabel(group.s2!)}
                              </button>
                            </div>
                          );
                        }

                        const slot = group.slot!;
                        const active = isActive(slot);
                        return (
                          <button key={gi} onClick={() => handleSlot(slot)} style={{ position: "absolute", top, left: 0, right: 0, height: `${SLOT_H}px`, background: slotBg(slot), border: active ? `2px solid ${ORANGE}` : "2px solid transparent", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", paddingLeft: "11px", boxSizing: "border-box" }}>
                            {slotLabel(slot)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "28px", background: "linear-gradient(to bottom,transparent,rgba(255,255,255,0.95))", pointerEvents: "none" }} />
              </div>
            </div>
          </div>

          {/* Bottom nav */}
          <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0 24px", gap: "10px" }}>
            <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "1.2px", textTransform: "uppercase", fontFamily: SYS, color: ORANGE, cursor: "pointer" }}>
              Add more things ›
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button style={{ background: "none", border: "none", cursor: "default", color: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", padding: "6px 8px" }}>
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button style={{ width: "44px", height: "44px", borderRadius: "14px", border: "none", background: ORANGE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ThingIcon size={20} strokeWidth={1.75} color="#fff" />
              </button>
              <button style={{ background: "none", border: "none", cursor: "default", color: "rgba(0,0,0,0.12)", display: "flex", alignItems: "center", padding: "6px 8px" }}>
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </div>
          </div>

        </div>
      </div>

      <Toast message={toast.message} visible={toast.visible} />

      {/* Modal */}
      {modal && (
        <div onClick={() => { setModal(null); setConfirmed(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 20px 36px", zIndex: 200 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "22px", padding: "28px", width: "100%", maxWidth: "400px", boxShadow: "0 16px 56px rgba(0,0,0,0.15)", fontFamily: SYS }}>

            {modal.type === "info" && (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "22px" }}>
                  <span style={{ fontSize: "19px", fontWeight: 700, color: "#1a1a1a" }}>{thing.name}</span>
                  <button onClick={() => setModal(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc" }}><X size={18} /></button>
                </div>
                {thing.instructions && (
                  <div style={{ fontSize: "14px", color: "#555", lineHeight: 1.7 }}>{thing.instructions}</div>
                )}
              </>
            )}

            {modal.type === "book" && !confirmed && (
              <>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", letterSpacing: "-0.4px", marginBottom: "3px" }}>Book {thing.name}</div>
                  <div style={{ fontSize: "14px", color: "#bbb", fontWeight: 500 }}>{MY_NAME}</div>
                </div>
                <div style={{ background: ORANGE_AVAIL, borderRadius: "14px", padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                  <TickRow label={`${fmtSlot(modal.start!)}${modal.start !== modal.end ? ` – ${fmtSlot(modal.end!)}` : ""}`} />
                  <TickRow label={selDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })} />
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1.5px solid #ede9e3", background: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: SYS, color: "#aaa" }}>Back</button>
                  <button onClick={() => setConfirmed(true)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: "#1a1a1a", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: SYS, color: "#fff" }}>Confirm</button>
                </div>
              </>
            )}

            {modal.type === "cancel" && !confirmed && (
              <>
                <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "6px", letterSpacing: "-0.4px" }}>Cancel your booking?</div>
                <div style={{ fontSize: "14px", color: "#bbb", marginBottom: "28px" }}>
                  {thing.name} · {fmtSlot(modal.start!)} · {selDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setModal(null)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "1.5px solid #ede9e3", background: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: SYS, color: "#aaa" }}>Keep it</button>
                  <button onClick={() => setConfirmed(true)} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", background: "#c0392b", cursor: "pointer", fontSize: "14px", fontWeight: 600, fontFamily: SYS, color: "#fff" }}>Cancel it</button>
                </div>
              </>
            )}

            {confirmed && (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ width: "52px", height: "52px", borderRadius: "50%", background: modal.type === "book" ? ORANGE : "#c0392b", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                  {modal.type === "book" ? <Check size={26} strokeWidth={2.5} color="#fff" /> : <X size={26} strokeWidth={2.5} color="#fff" />}
                </div>
                {modal.type === "book" && (
                  <>
                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "16px", letterSpacing: "-0.4px" }}>All booked, {MY_NAME}.</div>
                    <div style={{ background: ORANGE_AVAIL, borderRadius: "12px", padding: "14px 16px", textAlign: "left" }}>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>
                        {thing.name}. {fmtSlot(modal.start!)}{modal.start !== modal.end ? ` – ${fmtSlot(modal.end!)}` : ""}.
                      </div>
                      <div style={{ fontSize: "13px", color: "#bbb", lineHeight: 1.5 }}>Check your email for a calendar invite.</div>
                    </div>
                  </>
                )}
                {modal.type === "cancel" && (
                  <>
                    <div style={{ fontSize: "22px", fontWeight: 700, color: "#1a1a1a", marginBottom: "8px", letterSpacing: "-0.4px" }}>Booking cancelled.</div>
                    <div style={{ fontSize: "13px", color: "#bbb", lineHeight: 1.8 }}>Your slot has been freed up.</div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
