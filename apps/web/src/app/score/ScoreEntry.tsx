'use client'
import { useState, useReducer, useEffect, useRef } from "react";

const COURSE = {
  name: "Cumberwell Park — Red/Yellow",
  holes: [
    { num: 1, par: 4, si: 7, yards: 342 }, { num: 2, par: 4, si: 3, yards: 387 },
    { num: 3, par: 3, si: 15, yards: 155 }, { num: 4, par: 4, si: 11, yards: 310 },
    { num: 5, par: 5, si: 1, yards: 498 }, { num: 6, par: 4, si: 9, yards: 365 },
    { num: 7, par: 3, si: 13, yards: 170 }, { num: 8, par: 4, si: 5, yards: 395 },
    { num: 9, par: 5, si: 17, yards: 475 }, { num: 10, par: 4, si: 8, yards: 355 },
    { num: 11, par: 3, si: 16, yards: 148 }, { num: 12, par: 4, si: 2, yards: 410 },
    { num: 13, par: 4, si: 12, yards: 325 }, { num: 14, par: 5, si: 4, yards: 505 },
    { num: 15, par: 4, si: 10, yards: 348 }, { num: 16, par: 3, si: 18, yards: 135 },
    { num: 17, par: 4, si: 6, yards: 380 }, { num: 18, par: 5, si: 14, yards: 490 },
  ],
};
const NTP_HOLES = [3, 11, 16];
const LD_HOLES = [5, 14];

const ALL_PLAYERS = [
  { id: "p1", name: "You", initials: "MJ", hcIndex: 18, color: "#3a7d44" },
  { id: "p2", name: "Dave", initials: "DW", hcIndex: 12, color: "#2a6db5" },
  { id: "p3", name: "Rich", initials: "RS", hcIndex: 24, color: "#b85c2a" },
  { id: "p4", name: "Tommo", initials: "TH", hcIndex: 8, color: "#7a3aad" },
];

function allocateStrokes(hc: number, holes: typeof COURSE.holes) {
  const s = new Array(holes.length).fill(0);
  const order = holes.map((h, i) => ({ si: h.si, idx: i })).sort((a, b) => a.si - b.si);
  let r = hc;
  while (r > 0) { for (const o of order) { if (r <= 0) break; s[o.idx]!++; r--; } }
  return s;
}

function pts(gross: number, par: number, hc: number) {
  const d = (gross - hc) - par;
  return d >= 2 ? 0 : d === 1 ? 1 : d === 0 ? 2 : d === -1 ? 3 : d === -2 ? 4 : 5;
}

const ptsLabel = (p: number) =>
  p === 0 ? "0pts · blob" : p === 1 ? "1pt · bogey" : p === 2 ? "2pts · par" :
  p === 3 ? "3pts · birdie" : p === 4 ? "4pts · eagle" : "5pts!";

interface PlayerState { scores: (number | null)[]; pickups: boolean[]; }
interface AppState {
  hole: number; activePlayer: string;
  players: Record<string, PlayerState>;
  activePlayers: string[];
  showNTP: boolean; ntpResults: Record<number, string>; ldResults: Record<number, string>;
  showCard: boolean; showSettings: boolean;
}

function mkP(): PlayerState { return { scores: new Array(18).fill(null), pickups: new Array(18).fill(false) }; }

const init: AppState = {
  hole: 0, activePlayer: "p1",
  players: Object.fromEntries(ALL_PLAYERS.map(p => [p.id, mkP()])),
  activePlayers: ALL_PLAYERS.map(p => p.id),
  showNTP: false, ntpResults: {}, ldResults: {},
  showCard: false, showSettings: false,
};

type Action =
  | { type: "SCORE"; pid: string; h: number; v: number }
  | { type: "PICKUP"; pid: string; h: number }
  | { type: "UNDO"; pid: string; h: number }
  | { type: "HOLE"; h: number }
  | { type: "NEXT" }
  | { type: "SKIP_C" }
  | { type: "SAVE_C"; ct: string; h: number; d: string }
  | { type: "SET_PLAYER"; pid: string }
  | { type: "TOGGLE_CARD" }
  | { type: "TOGGLE_SETTINGS" }
  | { type: "TOGGLE_PLAYER"; pid: string }
  | { type: "RESET" }

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case "SCORE": {
      const p = { ...s.players[a.pid]! }; const sc = [...p.scores]; sc[a.h] = a.v;
      const pk = [...p.pickups]; pk[a.h] = false;
      return { ...s, players: { ...s.players, [a.pid]: { ...p, scores: sc, pickups: pk } } };
    }
    case "PICKUP": {
      const p = { ...s.players[a.pid]! }; const sc = [...p.scores]; sc[a.h] = null;
      const pk = [...p.pickups]; pk[a.h] = true;
      return { ...s, players: { ...s.players, [a.pid]: { ...p, scores: sc, pickups: pk } } };
    }
    case "UNDO": {
      const p = { ...s.players[a.pid]! }; const sc = [...p.scores]; sc[a.h] = null;
      const pk = [...p.pickups]; pk[a.h] = false;
      return { ...s, players: { ...s.players, [a.pid]: { ...p, scores: sc, pickups: pk } } };
    }
    case "HOLE": return { ...s, hole: a.h, showNTP: false };
    case "NEXT": {
      const h = COURSE.holes[s.hole]!;
      const isC = NTP_HOLES.includes(h.num) || LD_HOLES.includes(h.num);
      const any = s.activePlayers.some(pid => s.players[pid]!.scores[s.hole] !== null);
      if (isC && !s.showNTP && any) return { ...s, showNTP: true };
      return { ...s, hole: Math.min(s.hole + 1, 17), showNTP: false };
    }
    case "SKIP_C": return { ...s, showNTP: false, hole: Math.min(s.hole + 1, 17) };
    case "SAVE_C": {
      const k = a.ct === "ntp" ? "ntpResults" : "ldResults";
      return { ...s, [k]: { ...s[k], [a.h]: a.d }, showNTP: false, hole: Math.min(s.hole + 1, 17) };
    }
    case "SET_PLAYER": return { ...s, activePlayer: a.pid };
    case "TOGGLE_CARD": return { ...s, showCard: !s.showCard };
    case "TOGGLE_SETTINGS": return { ...s, showSettings: !s.showSettings };
    case "TOGGLE_PLAYER": {
      const ap = s.activePlayers.includes(a.pid)
        ? s.activePlayers.filter(id => id !== a.pid)
        : [...s.activePlayers, a.pid];
      if (!ap.length) return s;
      return { ...s, activePlayers: ap, activePlayer: ap.includes(s.activePlayer) ? s.activePlayer : ap[0]! };
    }
    case "RESET": return { ...init };
    default: return s;
  }
}

const navArr: React.CSSProperties = { width: 42, height: 46, borderRadius: 10, border: "1.5px solid", background: "#fff", fontSize: 22, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const bigStep: React.CSSProperties = { width: 44, height: 44, borderRadius: "50%", border: "1.5px solid #d0d8cc", background: "#fff", fontSize: 22, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7c6b" };
const thS: React.CSSProperties = { padding: "5px 5px", textAlign: "center", color: "#8a9a8a", fontWeight: 500, fontSize: 11, whiteSpace: "nowrap" };
const tdS: React.CSSProperties = { padding: "6px 5px", textAlign: "center", fontSize: 12 };

export default function ScoreEntry() {
  const [s, d] = useReducer(reducer, init);
  const [flash, setFlash] = useState<{ label: string; color: string } | null>(null);
  const [cDist, setCDist] = useState("");
  const [stepValue, setStepValue] = useState<number | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hole = COURSE.holes[s.hole]!;
  const isNTP = NTP_HOLES.includes(hole.num);
  const isLD = LD_HOLES.includes(hole.num);
  const ap = ALL_PLAYERS.filter(p => s.activePlayers.includes(p.id));
  const cp = ALL_PLAYERS.find(p => p.id === s.activePlayer) ?? ap[0]!;

  const hcMap: Record<string, number[]> = {};
  ALL_PLAYERS.forEach(p => { hcMap[p.id] = allocateStrokes(Math.round(p.hcIndex * 0.95), COURSE.holes); });
  const hcOnHole = hcMap[cp.id]![s.hole] ?? 0;
  const isPickup = s.players[cp.id]!.pickups[s.hole] ?? false;
  const currentScore = s.players[cp.id]!.scores[s.hole] ?? null;

  useEffect(() => { setStepValue(currentScore); }, [s.hole, s.activePlayer, currentScore]);

  function getTotal(pid: string) {
    let p = 0, h = 0;
    for (let i = 0; i < 18; i++) {
      const sc = s.players[pid]!.scores[i];
      const pu = s.players[pid]!.pickups[i];
      if (sc != null && !pu) { p += pts(sc, COURSE.holes[i]!.par, hcMap[pid]![i] ?? 0); h++; }
      else if (pu) h++;
    }
    return { pts: p, holes: h };
  }

  const tapScore = (value: number) => {
    const p = pts(value, hole.par, hcOnHole);
    d({ type: "SCORE", pid: cp.id, h: s.hole, v: value });
    setFlash({ label: ptsLabel(p), color: p >= 3 ? "#3a7d44" : p === 0 ? "#b43c3c" : "#6b7c6b" });
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 800);
    setTimeout(() => {
      const idx = ap.findIndex(pl => pl.id === cp.id);
      const next = ap.find((pl, i) => i > idx && s.players[pl.id]!.scores[s.hole] === null && !s.players[pl.id]!.pickups[s.hole]);
      if (next) { d({ type: "SET_PLAYER", pid: next.id }); }
      else {
        const allDone = ap.every(pl => pl.id === cp.id || s.players[pl.id]!.scores[s.hole] !== null || s.players[pl.id]!.pickups[s.hole]);
        if (allDone) { d({ type: "NEXT" }); d({ type: "SET_PLAYER", pid: ap[0]!.id }); }
        else {
          const first = ap.find(pl => s.players[pl.id]!.scores[s.hole] === null && !s.players[pl.id]!.pickups[s.hole] && pl.id !== cp.id);
          if (first) d({ type: "SET_PLAYER", pid: first.id });
        }
      }
    }, 400);
  };

  const tapPickup = () => {
    d({ type: "PICKUP", pid: cp.id, h: s.hole });
    setTimeout(() => {
      const idx = ap.findIndex(pl => pl.id === cp.id);
      const next = ap.find((pl, i) => i > idx && s.players[pl.id]!.scores[s.hole] === null && !s.players[pl.id]!.pickups[s.hole]);
      if (next) { d({ type: "SET_PLAYER", pid: next.id }); }
      else {
        const allDone = ap.every(pl => pl.id === cp.id || s.players[pl.id]!.scores[s.hole] !== null || s.players[pl.id]!.pickups[s.hole]);
        if (allDone) { d({ type: "NEXT" }); d({ type: "SET_PLAYER", pid: ap[0]!.id }); }
      }
    }, 300);
  };

  const quickVals = [hole.par - 1, hole.par, hole.par + 1, hole.par + 2, hole.par + 3].filter(v => v >= 1);

  if (s.showCard) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", background: "#FAFBF8", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#1a2e1a", minHeight: "100vh" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #e8ece4" }}>
          <button onClick={() => d({ type: "TOGGLE_CARD" })} style={{ background: "none", border: "none", fontSize: 14, color: "#3a7d44", fontWeight: 600, cursor: "pointer" }}>← Scoring</button>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Scorecard</div>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ overflowX: "auto", padding: "4px", WebkitOverflowScrolling: "touch" as const }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, minWidth: Math.max(400, 100 + ap.length * 62), width: "100%" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #d0d8cc" }}>
                <th style={thS}>#</th><th style={thS}>Par</th><th style={thS}>SI</th>
                {ap.map(p => <th key={p.id} style={{ ...thS, color: p.color, minWidth: 48 }}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {COURSE.holes.map((h, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f0f4ec", background: i === s.hole ? "#f5f9f2" : "transparent", cursor: "pointer" }}
                  onClick={() => { d({ type: "HOLE", h: i }); d({ type: "SET_PLAYER", pid: ap[0]!.id }); d({ type: "TOGGLE_CARD" }); }}>
                  <td style={{ ...tdS, fontWeight: 600 }}>{h.num}</td>
                  <td style={tdS}>{h.par}</td>
                  <td style={{ ...tdS, color: "#8a9a8a" }}>{h.si}</td>
                  {ap.map(p => {
                    const sc = s.players[p.id]!.scores[i];
                    const pu = s.players[p.id]!.pickups[i];
                    const pt = sc != null ? pts(sc, h.par, hcMap[p.id]![i] ?? 0) : null;
                    return <td key={p.id} style={{ ...tdS, fontWeight: 600, color: pu ? "#aaa" : sc != null ? "#1a2e1a" : "#ddd" }}>
                      {pu ? "NR" : sc != null ? <>{sc}<span style={{ fontWeight: 400, fontSize: 9, color: pt != null && pt >= 3 ? "#3a7d44" : pt === 0 ? "#c44" : "#888" }}> ({pt})</span></> : "–"}
                    </td>;
                  })}
                </tr>
              ))}
              {[{ l: "Out", a: 0, b: 9 }, { l: "In", a: 9, b: 18 }, { l: "Total", a: 0, b: 18 }].map(r => (
                <tr key={r.l} style={{ borderTop: r.l !== "In" ? "2px solid #d0d8cc" : "1px solid #e0e6dc", fontWeight: 700 }}>
                  <td style={tdS}>{r.l}</td>
                  <td style={tdS}>{COURSE.holes.slice(r.a, r.b).reduce((x, h) => x + h.par, 0)}</td>
                  <td />
                  {ap.map(p => {
                    let pt = 0;
                    for (let i = r.a; i < r.b; i++) {
                      const sc = s.players[p.id]!.scores[i];
                      if (sc != null && !s.players[p.id]!.pickups[i]) pt += pts(sc, COURSE.holes[i]!.par, hcMap[p.id]![i] ?? 0);
                    }
                    return <td key={p.id} style={{ ...tdS, color: p.color }}>{pt || "–"}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 420, margin: "0 auto", minHeight: "100vh", background: "#FAFBF8", fontFamily: "'DM Sans', system-ui, sans-serif", color: "#1a2e1a", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px 8px", borderBottom: "1px solid #e8ece4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.5 }}>LX<span style={{ color: "#3a7d44" }}>2</span></div>
          <div style={{ fontSize: 12, color: "#6b7c6b" }}>Red/Yellow</div>
        </div>
        <button onClick={() => d({ type: "TOGGLE_SETTINGS" })} style={{ background: "none", border: "1.5px solid #d0d8cc", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#4a5e4a", fontWeight: 500 }}>
          ⚙ Settings
        </button>
      </div>

      {s.showSettings && (
        <div style={{ padding: "10px 12px", background: "#f0f4ec", borderBottom: "1px solid #e0e6dc" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#6b7c6b", marginBottom: 6 }}>Players in group</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {ALL_PLAYERS.map(p => {
              const on = s.activePlayers.includes(p.id);
              return <button key={p.id} onClick={() => d({ type: "TOGGLE_PLAYER", pid: p.id })} style={{ padding: "6px 12px", borderRadius: 8, border: on ? `2px solid ${p.color}` : "1.5px solid #d0d8cc", background: on ? `${p.color}12` : "#fff", color: on ? p.color : "#8a9a8a", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{p.name} ({p.hcIndex})</button>;
            })}
          </div>
          <button onClick={() => d({ type: "RESET" })} style={{ marginTop: 8, padding: "6px 14px", border: "1px solid #d0d8cc", borderRadius: 8, background: "#fff", fontSize: 11, color: "#b43c3c", cursor: "pointer" }}>Reset all</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", padding: "6px 6px", gap: 4 }}>
        <button onClick={() => d({ type: "HOLE", h: Math.max(0, s.hole - 1) })} disabled={s.hole === 0}
          style={{ ...navArr, color: s.hole === 0 ? "#d0d8cc" : "#4a5e4a", borderColor: s.hole === 0 ? "#eee" : "#d0d8cc", cursor: s.hole === 0 ? "default" : "pointer" }}>‹</button>
        <div style={{ display: "flex", gap: 5, flex: 1, justifyContent: "center" }}>
          {(() => {
            let st = Math.max(0, s.hole - 1); if (st + 4 > 18) st = 14;
            return COURSE.holes.slice(st, st + 4).map((h, vi) => {
              const i = st + vi; const cur = i === s.hole;
              const allDone = ap.every(p => s.players[p.id]!.scores[i] != null || s.players[p.id]!.pickups[i]);
              const someDone = ap.some(p => s.players[p.id]!.scores[i] != null || s.players[p.id]!.pickups[i]);
              const isC = NTP_HOLES.includes(h.num) || LD_HOLES.includes(h.num);
              return <button key={i} onClick={() => { d({ type: "HOLE", h: i }); d({ type: "SET_PLAYER", pid: ap[0]!.id }); }} style={{ flex: 1, height: 46, maxWidth: 74, borderRadius: 10, border: cur ? "2.5px solid #3a7d44" : `1.5px solid ${allDone ? "rgba(58,125,68,0.4)" : "#d0d8cc"}`, background: cur ? "#e8f0e4" : allDone ? "rgba(58,125,68,0.05)" : "#fff", color: cur ? "#2a5e30" : allDone ? "#3a7d44" : "#6b7c6b", fontSize: 16, fontWeight: 700, cursor: "pointer", position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span>{h.num}</span>
                {someDone && !cur && <span style={{ fontSize: 9, opacity: 0.5, marginTop: -2 }}>{allDone ? "✓" : "··"}</span>}
                {isC && <div style={{ position: "absolute", top: 3, right: 4, width: 6, height: 6, borderRadius: "50%", background: NTP_HOLES.includes(h.num) ? "#e67e22" : "#3498db" }} />}
              </button>;
            });
          })()}
        </div>
        <button onClick={() => d({ type: "HOLE", h: Math.min(17, s.hole + 1) })} disabled={s.hole === 17}
          style={{ ...navArr, color: s.hole === 17 ? "#d0d8cc" : "#4a5e4a", borderColor: s.hole === 17 ? "#eee" : "#d0d8cc", cursor: s.hole === 17 ? "default" : "pointer" }}>›</button>
      </div>

      <div style={{ textAlign: "center", padding: "2px 16px 0" }}>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: -0.5 }}>Hole {hole.num}</div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 3 }}>
          {[{ l: "Par", v: hole.par }, { l: "SI", v: hole.si }, { l: "Yds", v: hole.yards }].map(x => (
            <div key={x.l}><span style={{ fontSize: 10, color: "#8a9a8a", textTransform: "uppercase", letterSpacing: 0.6 }}>{x.l} </span><span style={{ fontSize: 15, fontWeight: 600 }}>{x.v}</span></div>
          ))}
          {hcOnHole > 0 && <div><span style={{ fontSize: 10, color: "#8a9a8a", textTransform: "uppercase", letterSpacing: 0.6 }}>Shots </span><span style={{ fontSize: 15, fontWeight: 600, color: "#3a7d44" }}>+{hcOnHole}</span></div>}
        </div>
        {(isNTP || isLD) && <div style={{ display: "inline-flex", background: isNTP ? "#fef3e2" : "#e8f4fd", color: isNTP ? "#b8660b" : "#1a6da0", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, marginTop: 3 }}>{isNTP ? "Nearest the pin" : "Longest drive"}</div>}
      </div>

      <div style={{ flex: 1, padding: "10px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, position: "relative" }}>
        {flash && (
          <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", background: flash.color + "14", color: flash.color, border: `1.5px solid ${flash.color}30`, padding: "4px 16px", borderRadius: 20, fontSize: 14, fontWeight: 600, zIndex: 5 }}>{flash.label}</div>
        )}

        {!isPickup ? (
          <>
            <div style={{ width: 96, height: 96, borderRadius: 20, background: currentScore != null ? cp.color : stepValue != null ? cp.color : "#f0f4ec", color: (currentScore != null || stepValue != null) ? "#fff" : "#b0bab0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 700, opacity: currentScore != null ? 0.5 : 1 }}>
              {currentScore ?? stepValue ?? "–"}
            </div>
            {currentScore != null && (
              <div style={{ fontSize: 12, color: "#8a9a8a" }}>
                Score saved
                <button onClick={() => { d({ type: "UNDO", pid: cp.id, h: s.hole }); setStepValue(null); }} style={{ marginLeft: 8, background: "none", border: "none", color: "#b43c3c", fontSize: 12, cursor: "pointer", textDecoration: "underline" }}>undo</button>
              </div>
            )}
            {currentScore == null && (
              <>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  {quickVals.map(v => (
                    <button key={v} onClick={() => tapScore(v)} style={{ width: 54, height: 54, borderRadius: 14, border: `1.5px solid ${cp.color}40`, background: "#fff", color: cp.color, fontSize: 20, fontWeight: 700, cursor: "pointer" }}>{v}</button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 4 }}>
                  <button onClick={() => setStepValue(Math.max(1, (stepValue ?? hole.par) - 1))} style={bigStep}>−</button>
                  <div style={{ width: 48, textAlign: "center", fontSize: 24, fontWeight: 700, color: stepValue != null && !quickVals.includes(stepValue) ? cp.color : "#ccc" }}>
                    {stepValue != null && !quickVals.includes(stepValue) ? stepValue : ""}
                  </div>
                  <button onClick={() => setStepValue(Math.min(15, (stepValue ?? hole.par) + 1))} style={bigStep}>+</button>
                  {stepValue != null && !quickVals.includes(stepValue) && (
                    <button onClick={() => tapScore(stepValue)} style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: cp.color, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save {stepValue}</button>
                  )}
                </div>
                <button onClick={tapPickup} style={{ padding: "8px 20px", border: "1px solid #d0d8cc", borderRadius: 10, background: "transparent", fontSize: 13, color: "#8a9a8a", cursor: "pointer", minHeight: 42 }}>Pick up / NR</button>
              </>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 16, color: "#8a9a8a", marginBottom: 8 }}>No return</div>
            <button onClick={() => d({ type: "UNDO", pid: cp.id, h: s.hole })} style={{ padding: "8px 20px", border: "1px solid #d0d8cc", borderRadius: 8, background: "#fff", fontSize: 13, color: "#b43c3c", cursor: "pointer" }}>Undo NR</button>
          </div>
        )}
      </div>

      {s.showNTP && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "#fff", borderTop: "2px solid #3a7d44", padding: "14px 14px 28px", zIndex: 10, borderRadius: "14px 14px 0 0", boxShadow: "0 -6px 24px rgba(0,0,0,0.08)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{isNTP ? "Nearest the Pin" : "Longest Drive"} — Hole {hole.num}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="number" placeholder="Distance" value={cDist} onChange={e => setCDist(e.target.value)} style={{ flex: 1, padding: "11px 12px", border: "1.5px solid #d0d8cc", borderRadius: 8, fontSize: 16, fontWeight: 500 }} />
            <span style={{ fontSize: 13, color: "#6b7c6b" }}>yds</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button onClick={() => { setCDist(""); d({ type: "SKIP_C" }); }} style={{ flex: 1, padding: "13px 0", border: "1px solid #d0d8cc", borderRadius: 10, background: "#fff", fontSize: 14, color: "#6b7c6b", cursor: "pointer" }}>Skip</button>
            <button onClick={() => { if (cDist) { d({ type: "SAVE_C", ct: isNTP ? "ntp" : "ld", h: hole.num, d: cDist }); setCDist(""); } }} style={{ flex: 2, padding: "13px 0", border: "none", borderRadius: 10, background: "#3a7d44", fontSize: 14, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Save</button>
          </div>
        </div>
      )}

      <div style={{ padding: "0 8px 4px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {ap.map(p => {
            const active = p.id === cp.id;
            const tot = getTotal(p.id);
            const hasScore = s.players[p.id]!.scores[s.hole] != null || s.players[p.id]!.pickups[s.hole];
            return (
              <button key={p.id} onClick={() => d({ type: "SET_PLAYER", pid: p.id })} style={{ flex: 1, padding: "8px 2px 6px", borderRadius: 10, cursor: "pointer", border: active ? `2.5px solid ${p.color}` : `1.5px solid ${hasScore ? p.color + "50" : "#d8ddd4"}`, background: active ? p.color + "10" : hasScore ? p.color + "06" : "#fff", display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: active ? p.color : p.color + "20", color: active ? "#fff" : p.color, fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{p.initials}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: active ? p.color : "#4a5e4a" }}>{p.name}</span>
                </div>
                <div style={{ fontSize: 10, color: "#8a9a8a" }}>
                  {tot.holes > 0 ? <span style={{ fontWeight: 600, color: p.color }}>{tot.pts}pts</span> : `HC ${p.hcIndex}`}
                  {hasScore && !active && <span style={{ marginLeft: 3, color: p.color }}>✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "4px 10px 20px" }}>
        <button onClick={() => d({ type: "TOGGLE_CARD" })} style={{ width: "100%", padding: "14px 0", border: "1.5px solid #3a7d44", borderRadius: 12, background: "#e8f0e4", color: "#2a5e30", fontSize: 15, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          Scorecard
          <span style={{ fontSize: 12, fontWeight: 400, color: "#6b9b6b" }}>
            {(() => { const t = ap.reduce((a, p) => { const tt = getTotal(p.id); return tt.holes > a.holes ? tt : a; }, { pts: 0, holes: 0 }); return t.holes > 0 ? `· thru ${t.holes}` : ""; })()}
          </span>
        </button>
      </div>

      <style>{`@keyframes fadeout { 0% { opacity: 1; transform: translateX(-50%) translateY(0); } 100% { opacity: 0; transform: translateX(-50%) translateY(-10px); } }`}</style>
    </div>
  );
}
