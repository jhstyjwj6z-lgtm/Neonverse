import React, { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
import {
  Home, Gamepad2, User, Trophy, ShoppingBag, Settings as SettingsIcon, Heart, Search, Volume2, VolumeX,
  Zap, Star, X, Play, RotateCcw, Sparkles, Timer, Brain, Hash, Scissors, Bell, Check, Lock, Music,
  Flame, Target, Award, ArrowLeft, ChevronRight, Users, Cpu, Crown,
} from "lucide-react";
import { CATALOG as BASE_CATALOG } from "./catalog.js";

/* ==========================================================================
   NEONVERSE — a cyberpunk gaming platform
   Sections: 1 Data · 2 Helpers · 3 Storage · 4 Sound · 5 Context
             6 UI atoms · 7 Games · 8 Pages · 9 App · 10 Styles
   ========================================================================== */

/* ============================== 1. DATA ================================== */

const SAVE_KEY = "neonverse:save:v1";

const THEMES = {
  dusk: { name: "Dusk", a1: "#8b7cf6", a2: "#5b8def", a3: "#7dd3e0", hot: "#e58bc4" },
  ocean: { name: "Ocean", a1: "#4f9cd9", a2: "#3b6fb6", a3: "#8fd3d0", hot: "#7fb2e5" },
  ember: { name: "Ember", a1: "#e0845a", a2: "#c4566b", a3: "#f0c27b", hot: "#e57373" },
  forest: { name: "Forest", a1: "#5fae88", a2: "#3f8f8b", a3: "#b7d98a", hot: "#8fcf9f" },
};

const AVATARS = ["🦊", "🐺", "🤖", "👾", "🦅", "🐉", "🧠", "👽", "🥷", "🦂", "🐙", "🪐"];

const ARENA = [
  { id: "reaction", name: "Reflex Pulse", kind: "Reaction speed test", blurb: "Wait for the signal, then hit it before it fades. Five rounds, one average.", icon: Timer, c1: "#25f2ff", c2: "#3d7bff" },
  { id: "guess", name: "Cipher Lock", kind: "Number guessing", blurb: "Crack the hidden number with hot and cold feedback.", icon: Target, c1: "#a24bff", c2: "#ff4fd8" },
  { id: "memory", name: "Echo Grid", kind: "Memory challenge", blurb: "Flip tiles, match pairs and beat the clock.", icon: Brain, c1: "#3dffa8", c2: "#25f2ff" },
  { id: "ttt", name: "Tri-Line", kind: "Tic Tac Toe", blurb: "Face the AI or a friend. Hard mode never blunders.", icon: Hash, c1: "#ff9a3d", c2: "#ff3d6e" },
  { id: "rps", name: "Clash Protocol", kind: "Rock Paper Scissors", blurb: "First to three rounds takes the match.", icon: Scissors, c1: "#ff4fd8", c2: "#a24bff" },
];

const GENRES = ["Action", "RPG", "Racing", "Puzzle", "Strategy", "Horror", "Sports", "Arcade"];

const ACHIEVEMENTS = [
  { id: "hello", icon: "👋", name: "Plugged in", desc: "Create your player profile", xp: 10, test: (s) => s.profile.onboarded },
  { id: "first", icon: "🎮", name: "First match", desc: "Finish any game", xp: 15, test: (s) => s.totals.plays >= 1 },
  { id: "all", icon: "🌐", name: "Arena regular", desc: "Play all five games", xp: 40, test: (s) => ARENA.every((g) => s.stats[g.id].plays > 0) },
  { id: "reflex", icon: "⚡", name: "Lightning reflexes", desc: "Average under 250 ms in Reflex Pulse", xp: 40, test: (s) => s.stats.reaction.best != null && s.stats.reaction.best < 250 },
  { id: "mind", icon: "🎯", name: "Mind reader", desc: "Crack Cipher Lock in 3 tries or fewer", xp: 40, test: (s) => s.stats.guess.best != null && s.stats.guess.best <= 3 },
  { id: "photo", icon: "🧠", name: "Photographic", desc: "Clear 8+ pairs with at most 4 spare moves", xp: 50, test: (s) => s.stats.memory.sharp },
  { id: "stale", icon: "🛡️", name: "Stalemate", desc: "Hold a draw against the Hard AI in Tri-Line", xp: 50, test: (s) => s.stats.ttt.hardDraws > 0 || s.stats.ttt.hardWins > 0 },
  { id: "fire", icon: "🔥", name: "On fire", desc: "Win 3 Clash Protocol rounds in a row", xp: 30, test: (s) => s.stats.rps.bestStreak >= 3 },
  { id: "fav", icon: "💜", name: "Collector", desc: "Favorite 5 games in the store", xp: 25, test: (s) => s.favorites.length >= 5 },
  { id: "vet", icon: "🏆", name: "Veteran", desc: "Finish 25 games", xp: 60, test: (s) => s.totals.plays >= 25 },
  { id: "lv5", icon: "🚀", name: "Rising star", desc: "Reach level 5", xp: 50, test: (s) => levelFromXp(s.xp) >= 5 },
  { id: "lv10", icon: "👑", name: "Neon legend", desc: "Reach level 10", xp: 120, test: (s) => levelFromXp(s.xp) >= 10 },
];

const defaultState = () => ({
  profile: { name: "", avatar: 0, onboarded: false },
  xp: 0,
  totals: { plays: 0, wins: 0 },
  stats: {
    reaction: { plays: 0, best: null },
    guess: { plays: 0, wins: 0, best: null },
    memory: { plays: 0, best: { easy: null, normal: null, hard: null }, sharp: false },
    ttt: { plays: 0, wins: 0, losses: 0, draws: 0, hardDraws: 0, hardWins: 0 },
    rps: { plays: 0, wins: 0, losses: 0, bestStreak: 0 },
  },
  achievements: {},
  favorites: [],
  notify: [],
  settings: { sound: true, volume: 0.6, music: false, theme: "dusk", effects: true, intro: true, haptics: true },
});

/* ============================== 2. HELPERS =============================== */

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const fmt = (n) => Number(n || 0).toLocaleString("en-US");
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
function levelFromXp(xp) { return Math.floor(Math.sqrt(Math.max(0, xp) / 60)) + 1; }
const xpForLevel = (l) => 60 * (l - 1) * (l - 1);
const RANKS = ["Rookie", "Runner", "Pilot", "Operator", "Specter", "Vanguard", "Legend", "Mythic"];
const rankOf = (l) => RANKS[Math.min(RANKS.length - 1, Math.floor((l - 1) / 2))];
const priceLabel = (p) => (!p ? "Free" : "$" + p.toFixed(2));
const tagFor = (g) => (g.status === "soon" ? "Coming soon" : priceLabel(g.price));
const avatarBg = (i) => `linear-gradient(135deg,hsl(${i * 30} 90% 58%),hsl(${i * 30 + 50} 85% 36%))`;

let HAPTICS = true;
const buzz = (ms) => { try { if (HAPTICS && navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* noop */ } };

const mergeState = (saved) => {
  const d = defaultState();
  if (!saved) return d;
  const stats = {};
  Object.keys(d.stats).forEach((k) => { stats[k] = { ...d.stats[k], ...((saved.stats && saved.stats[k]) || {}) }; });
  return {
    ...d, ...saved,
    profile: { ...d.profile, ...saved.profile },
    totals: { ...d.totals, ...saved.totals },
    settings: { ...d.settings, ...saved.settings },
    stats,
    achievements: { ...(saved.achievements || {}) },
    favorites: saved.favorites || [],
    notify: saved.notify || [],
  };
};

/* ============================== 3. STORAGE =============================== */
/* Saves through the artifact storage API when present, then localStorage
   (used when the app runs on your own site), then in-memory as a last resort. */

const memoryStore = {};
const Storage = {
  async load(key) {
    try {
      if (window.storage) {
        const r = await window.storage.get(key);
        if (r && r.value) return JSON.parse(r.value);
      }
    } catch (e) { /* key missing */ }
    try {
      const v = window.localStorage.getItem(key);
      if (v) return JSON.parse(v);
    } catch (e) { /* storage blocked */ }
    return memoryStore[key] ?? null;
  },
  async save(key, value) {
    memoryStore[key] = value;
    const json = JSON.stringify(value);
    try {
      if (window.storage) { await window.storage.set(key, json); return; }
    } catch (e) { /* fall through */ }
    try { window.localStorage.setItem(key, json); } catch (e) { /* blocked */ }
  },
};

const ENV = import.meta.env || {};
const SB_URL = (ENV.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SB_KEY = ENV.VITE_SUPABASE_ANON_KEY || "";
const ADMIN_CODE = ENV.VITE_ADMIN_CODE || "";
const CATALOG_KEY = "neonverse:catalog:v1";

/* Online leaderboard through Supabase (see README). Without the two
   VITE_SUPABASE_* variables the app still works, only locally. */
const Board = {
  online: !!(SB_URL && SB_KEY),
  headers: () => ({ apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" }),
  slug: (name) => String(name || "player").toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 40),
  async publish(entry) {
    if (!Board.online) return;
    try {
      await fetch(`${SB_URL}/rest/v1/players?on_conflict=id`, {
        method: "POST",
        headers: { ...Board.headers(), Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({ id: Board.slug(entry.name), name: entry.name, avatar: entry.avatar, xp: entry.xp, wins: entry.wins, reaction: entry.reaction, updated_at: new Date().toISOString() }),
      });
    } catch (e) { /* offline */ }
  },
  async fetchAll() {
    if (!Board.online) return [];
    try {
      const r = await fetch(`${SB_URL}/rest/v1/players?select=name,avatar,xp,wins,reaction&order=xp.desc&limit=200`, { headers: Board.headers() });
      return r.ok ? await r.json() : [];
    } catch (e) { return []; }
  },
};

/* ============================== 4. SOUND ================================= */

const Sound = (() => {
  let ctx = null, master = null, enabled = true, volume = 0.6, music = false, timer = null, step = 0;
  const ensure = () => {
    if (!ctx) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
      } catch (e) { return null; }
    }
    if (ctx.state === "suspended") { try { ctx.resume(); } catch (e) { /* noop */ } }
    return ctx;
  };
  const tone = (freq, dur = 0.12, type = "sine", vol = 0.2, delay = 0, slide = 0) => {
    if (!enabled) return;
    const c = ensure();
    if (!c) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  };
  const seq = (notes, type, dur, vol, gap) => notes.forEach((f, i) => tone(f, dur, type, vol, i * gap));
  const FX = {
    click: () => tone(660, 0.06, "square", 0.1),
    nav: () => seq([440, 660], "triangle", 0.1, 0.16, 0.06),
    success: () => seq([523, 659, 784], "triangle", 0.14, 0.18, 0.08),
    win: () => seq([523, 659, 784, 1047], "sawtooth", 0.18, 0.12, 0.1),
    lose: () => seq([330, 262, 196], "sawtooth", 0.22, 0.12, 0.12),
    error: () => tone(170, 0.18, "square", 0.13, 0, -60),
    tick: () => tone(1000, 0.04, "square", 0.08),
    go: () => tone(880, 0.25, "sine", 0.28),
    flip: () => tone(520, 0.07, "triangle", 0.14, 0, 200),
    match: () => { tone(784, 0.1, "triangle", 0.18); tone(1175, 0.16, "triangle", 0.18, 0.08); },
    place: () => tone(420, 0.09, "triangle", 0.2, 0, 80),
    place2: () => tone(300, 0.09, "triangle", 0.2, 0, -60),
    level: () => seq([392, 523, 659, 784, 1047], "triangle", 0.16, 0.2, 0.08),
  };
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
  const PAT = [0, 2, 4, 2, 5, 4, 2, 3];
  const musicTick = () => {
    if (!enabled || !music) return;
    const f = SCALE[PAT[step % 8]] * (step % 32 < 16 ? 1 : 1.2);
    tone(f, 0.5, "sine", 0.05);
    if (step % 8 === 0) tone(f / 4, 0.9, "triangle", 0.08);
    step++;
  };
  const syncMusic = () => {
    clearInterval(timer);
    timer = null;
    if (enabled && music) { ensure(); timer = setInterval(musicTick, 260); }
  };
  return {
    play: (n) => { if (FX[n]) FX[n](); },
    unlock: () => { ensure(); },
    configure: (o) => {
      enabled = o.enabled; volume = o.volume; music = o.music;
      if (master) master.gain.value = volume;
      syncMusic();
    },
  };
})();

/* ============================== 5. CONTEXT =============================== */

const Ctx = createContext(null);
const useApp = () => useContext(Ctx);

/* ============================== 6. UI ATOMS ============================== */

function Avatar({ i, size = 40 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.52, background: avatarBg(i) }}>
      {AVATARS[i % AVATARS.length]}
    </span>
  );
}

function Tilt({ as: Tag = "div", className = "", children, ...rest }) {
  const ref = useRef(null);
  const move = (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", (-y * 9).toFixed(2) + "deg");
    el.style.setProperty("--ry", (x * 11).toFixed(2) + "deg");
    el.style.setProperty("--mx", (x + 0.5) * 100 + "%");
    el.style.setProperty("--my", (y + 0.5) * 100 + "%");
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <Tag ref={ref} className={"tilt " + className} onPointerMove={move} onPointerLeave={leave} {...rest}>
      {children}
    </Tag>
  );
}

function LevelBar({ xp }) {
  const l = levelFromXp(xp);
  const base = xpForLevel(l);
  const next = xpForLevel(l + 1);
  const pct = clamp(((xp - base) / (next - base)) * 100, 0, 100);
  return <div className="lvlbar"><div className="lvlbar-fill" style={{ width: pct + "%" }} /></div>;
}

function Modal({ onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
  return (
    <div className="modal-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={"modal glass" + (wide ? " wide" : "")} role="dialog" aria-modal="true">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, label, hint }) {
  return (
    <button className={"toggle" + (on ? " on" : "")} role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="toggle-text"><b>{label}</b>{hint && <small>{hint}</small>}</span>
      <span className="knob"><i /></span>
    </button>
  );
}

function Chips({ options, value, onChange, render }) {
  return (
    <div className="chips" role="tablist">
      {options.map((o) => (
        <button key={o} role="tab" aria-selected={value === o} className={"chip" + (value === o ? " on" : "")} onClick={() => onChange(o)}>
          {render ? render(o) : o}
        </button>
      ))}
    </div>
  );
}

function Toasts({ items }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast glass">
          <span className="toast-ic">{t.icon}</span>
          <span><b>{t.title}</b><small>{t.text}</small></span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ tone = "win", title, lines = [], xp, onAgain, onExit, againLabel = "Play again" }) {
  return (
    <div className={"result glass " + tone}>
      <div className="result-title display">{title}</div>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
      <div className="xp-pop"><Zap size={18} /> +{xp} XP</div>
      <div className="row center">
        <button className="btn primary" onClick={onAgain}><RotateCcw size={16} /> {againLabel}</button>
        <button className="btn ghost" onClick={onExit}>Back to arena</button>
      </div>
    </div>
  );
}

function Background({ colors, enabled }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return undefined;
    const ctx = c.getContext("2d");
    let raf = 0, w = 0, h = 0;
    const parts = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random() * 0.8 + 0.2, s: Math.random() * 0.0004 + 0.0001 }));
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.clientWidth; h = c.clientHeight;
      c.width = w * dpr; c.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const glow = (x, y, col, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.6);
      g.addColorStop(0, hexA(col, a)); g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    };
    const draw = (now) => {
      const t = enabled ? now / 1000 : 0;
      ctx.clearRect(0, 0, w, h);
      glow(w * 0.18, h * 0.12, colors.a1, 0.13);
      glow(w * 0.88, h * 0.92, colors.a2, 0.1);
      const hy = h * 0.66;
      ctx.lineWidth = 1;
      ctx.strokeStyle = hexA(colors.a2, 0.1);
      for (let i = -14; i <= 14; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * 8, hy);
        ctx.lineTo(w / 2 + i * w * 0.14, h);
        ctx.stroke();
      }
      for (let k = 0; k < 12; k++) {
        const p = ((k + t * 0.35) % 12) / 12;
        const y = hy + (h - hy) * p * p;
        ctx.strokeStyle = hexA(colors.a3, p * 0.14);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      parts.forEach((p) => {
        if (enabled) { p.y -= p.s * 16; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); } }
        ctx.fillStyle = hexA(colors.a3, 0.3 * p.z);
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 0.8 + p.z * 1.4, 0, 6.283); ctx.fill();
      });
      if (enabled) raf = requestAnimationFrame(draw);
    };
    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [colors.a1, colors.a2, colors.a3, enabled]);
  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}

function Portal({ count = 9 }) {
  return (
    <div className="portal" aria-hidden="true">
      <div className="portal-in">
        {Array.from({ length: count }, (_, i) => <i key={i} className={"ring r" + (i % 3)} style={{ "--i": i }} />)}
        <b className="core" />
      </div>
    </div>
  );
}

/* ============================== 7. GAMES ================================= */

/* ---- Reflex Pulse ---- */
function ReactionGame({ onExit }) {
  const { recordGame } = useApp();
  const ROUNDS = 5;
  const [phase, setPhase] = useState("idle");
  const [times, setTimes] = useState([]);
  const [result, setResult] = useState(null);
  const timer = useRef(null);
  const startAt = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  const arm = () => {
    setPhase("wait");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      startAt.current = performance.now();
      setPhase("go");
      Sound.play("go");
      buzz(30);
    }, 1200 + Math.random() * 2800);
  };
  const finish = (arr) => {
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    const xp = clamp(Math.round((650 - avg) / 8), 10, 70);
    recordGame("reaction", (s) => ({ ...s, plays: s.plays + 1, best: s.best == null ? avg : Math.min(s.best, avg) }), xp, { win: avg < 400 });
    Sound.play(avg < 400 ? "win" : "lose");
    setResult({ avg, xp, arr });
  };
  const press = () => {
    if (result) return;
    if (phase === "idle" || phase === "between" || phase === "early") { Sound.play("click"); arm(); return; }
    if (phase === "wait") { clearTimeout(timer.current); setPhase("early"); Sound.play("error"); buzz(60); return; }
    if (phase === "go") {
      const t = Math.round(performance.now() - startAt.current);
      const next = [...times, t];
      setTimes(next);
      Sound.play("success");
      if (next.length >= ROUNDS) { setPhase("done"); finish(next); } else setPhase("between");
    }
  };
  const reset = () => { clearTimeout(timer.current); setTimes([]); setResult(null); setPhase("idle"); };

  if (result) {
    return (
      <ResultCard
        tone={result.avg < 400 ? "win" : "lose"}
        title={`${result.avg} ms average`}
        lines={[result.arr.map((t) => t + " ms").join("  ·  "), result.avg < 250 ? "Elite reflexes." : result.avg < 400 ? "Solid run. Faster is possible." : "Warm up and go again."]}
        xp={result.xp} onAgain={reset} onExit={onExit}
      />
    );
  }
  const last = times[times.length - 1];
  const copy = {
    idle: ["Tap to start", "Five rounds. Tap the moment the screen turns green."],
    wait: ["Wait for green…", "Tapping now counts as a false start."],
    go: ["TAP!", ""],
    early: ["Too early", "Tap to retry this round."],
    between: [`${last} ms`, `Tap for round ${times.length + 1} of ${ROUNDS}`],
    done: ["", ""],
  }[phase];
  return (
    <div>
      <div className={"rx " + phase} role="button" tabIndex={0} onPointerDown={press}
        onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); press(); } }}>
        <div><h3 className="display">{copy[0]}</h3><p>{copy[1]}</p></div>
      </div>
      <div className="round-chips">
        {Array.from({ length: ROUNDS }, (_, i) => <span key={i} className={"rchip" + (times[i] != null ? " on" : "")}>{times[i] != null ? times[i] + " ms" : "–"}</span>)}
      </div>
    </div>
  );
}

/* ---- Cipher Lock ---- */
const GUESS_DIFF = {
  easy: { max: 50, tries: 8, bonus: 0, label: "Easy · 1–50" },
  normal: { max: 100, tries: 7, bonus: 10, label: "Normal · 1–100" },
  hard: { max: 500, tries: 9, bonus: 25, label: "Hard · 1–500" },
};
function GuessGame({ onExit }) {
  const { recordGame } = useApp();
  const [diff, setDiff] = useState("normal");
  const cfg = GUESS_DIFF[diff];
  const [secret, setSecret] = useState(() => rand(1, 100));
  const [guesses, setGuesses] = useState([]);
  const [val, setVal] = useState("");
  const [msg, setMsg] = useState("I'm thinking of a number between 1 and 100.");
  const [status, setStatus] = useState("play");
  const [res, setRes] = useState(null);
  const inputRef = useRef(null);

  const newRound = (d = diff) => {
    const c = GUESS_DIFF[d];
    setSecret(rand(1, c.max)); setGuesses([]); setVal(""); setStatus("play"); setRes(null);
    setMsg(`I'm thinking of a number between 1 and ${c.max}.`);
  };
  const pickDiff = (d) => { Sound.play("click"); setDiff(d); newRound(d); };

  let lo = 1, hi = cfg.max;
  guesses.forEach((g) => { if (g.n < secret) lo = Math.max(lo, g.n + 1); else if (g.n > secret) hi = Math.min(hi, g.n - 1); });

  const submit = () => {
    if (status !== "play") return;
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1 || n > cfg.max) { setMsg(`Enter a whole number from 1 to ${cfg.max}.`); Sound.play("error"); return; }
    if (guesses.some((g) => g.n === n)) { setMsg("You already tried that number."); Sound.play("error"); return; }
    const dist = Math.abs(n - secret) / cfg.max;
    const heat = dist === 0 ? "hit" : dist < 0.05 ? "burning" : dist < 0.15 ? "hot" : dist < 0.3 ? "warm" : "cold";
    const next = [...guesses, { n, dir: n < secret ? "up" : "down", heat }];
    setGuesses(next); setVal("");
    if (n === secret) {
      const left = cfg.tries - next.length;
      const xp = 25 + left * 6 + cfg.bonus;
      recordGame("guess", (s) => ({ ...s, plays: s.plays + 1, wins: s.wins + 1, best: s.best == null ? next.length : Math.min(s.best, next.length) }), xp, { win: true });
      Sound.play("win"); setStatus("won"); setRes({ xp, tries: next.length });
      return;
    }
    if (next.length >= cfg.tries) {
      recordGame("guess", (s) => ({ ...s, plays: s.plays + 1 }), 5);
      Sound.play("lose"); setStatus("lost"); setRes({ xp: 5 });
      return;
    }
    Sound.play("tick");
    setMsg(`${n} is too ${n < secret ? "low" : "high"}. You're ${heat}.`);
    if (inputRef.current) inputRef.current.focus();
  };

  if (status !== "play" && res) {
    return (
      <ResultCard
        tone={status === "won" ? "win" : "lose"}
        title={status === "won" ? `Unlocked in ${res.tries}` : "Lock held"}
        lines={[status === "won" ? `The number was ${secret}.` : `The number was ${secret}. Try a tighter strategy: halve the range each guess.`]}
        xp={res.xp} onAgain={() => newRound()} onExit={onExit}
      />
    );
  }
  const left = cfg.tries - guesses.length;
  return (
    <div className="stack">
      <Chips options={Object.keys(GUESS_DIFF)} value={diff} onChange={pickDiff} render={(k) => GUESS_DIFF[k].label} />
      <div className="glass pad">
        <p className="msg">{msg}</p>
        <div className="range" aria-label={`Possible range ${lo} to ${hi}`}>
          <div className="range-fill" style={{ left: ((lo - 1) / cfg.max) * 100 + "%", right: (1 - hi / cfg.max) * 100 + "%" }} />
        </div>
        <div className="range-lbl"><span>{lo}</span><span>{hi}</span></div>
        <div className="row">
          <input ref={inputRef} className="input big" type="number" inputMode="numeric" placeholder="Your guess" value={val}
            onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          <button className="btn primary" onClick={submit}>Guess</button>
        </div>
        <div className="pips" aria-label={`${left} tries left`}>
          {Array.from({ length: cfg.tries }, (_, i) => <span key={i} className={i < left ? "on" : ""} />)}
        </div>
      </div>
      <div className="hist">
        {guesses.slice().reverse().map((g) => (
          <span key={g.n} className={"hchip " + g.heat}>{g.n} {g.dir === "up" ? "▲" : "▼"} <small>{g.heat}</small></span>
        ))}
      </div>
    </div>
  );
}

/* ---- Echo Grid ---- */
const MEM_SYMS = ["🚀", "👾", "🧬", "💎", "🔮", "⚡", "🛸", "🎧", "🧿", "🕹️", "🪐", "🔥"];
const MEM_DIFF = { easy: { pairs: 6, cols: 4 }, normal: { pairs: 8, cols: 4 }, hard: { pairs: 12, cols: 6 } };
const buildDeck = (pairs) => shuffle(MEM_SYMS.slice(0, pairs).flatMap((s, i) => [{ key: i + "a", sym: s, pair: i }, { key: i + "b", sym: s, pair: i }]));

function MemoryGame({ onExit }) {
  const { recordGame } = useApp();
  const [diff, setDiff] = useState("normal");
  const cfg = MEM_DIFF[diff];
  const [deck, setDeck] = useState(() => buildDeck(8));
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [res, setRes] = useState(null);
  const lock = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!started || finished) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [started, finished]);

  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };
  const newGame = (d = diff) => {
    timers.current.forEach(clearTimeout); timers.current = [];
    lock.current = false;
    setDeck(buildDeck(MEM_DIFF[d].pairs)); setOpen([]); setMatched([]); setMoves(0); setSeconds(0);
    setStarted(false); setFinished(false); setRes(null);
  };
  const pickDiff = (d) => { Sound.play("click"); setDiff(d); newGame(d); };

  const finish = (m) => {
    setFinished(true);
    const extra = m - cfg.pairs;
    const xp = clamp(Math.round(cfg.pairs * 5 + Math.max(0, 24 - extra * 2) + Math.max(0, cfg.pairs * 8 - seconds) / 2), 10, 120);
    const sharp = cfg.pairs >= 8 && extra <= 4;
    recordGame("memory", (s) => ({
      ...s, plays: s.plays + 1,
      best: { ...s.best, [diff]: s.best[diff] == null ? m : Math.min(s.best[diff], m) },
      sharp: s.sharp || sharp,
    }), xp, { win: true });
    later(() => { Sound.play("win"); setRes({ xp, moves: m, seconds, sharp }); }, 700);
  };
  const flip = (i) => {
    if (lock.current || finished) return;
    if (open.includes(i) || matched.includes(deck[i].pair)) return;
    if (!started) setStarted(true);
    Sound.play("flip"); buzz(10);
    const nextOpen = [...open, i];
    setOpen(nextOpen);
    if (nextOpen.length === 2) {
      const m = moves + 1;
      setMoves(m);
      const [a, b] = nextOpen;
      if (deck[a].pair === deck[b].pair) {
        const nm = [...matched, deck[a].pair];
        setMatched(nm); setOpen([]);
        later(() => Sound.play("match"), 150);
        if (nm.length === cfg.pairs) finish(m);
      } else {
        lock.current = true;
        later(() => { setOpen([]); lock.current = false; }, 750);
      }
    }
  };

  if (res) {
    return (
      <ResultCard title="Grid cleared"
        lines={[`${res.moves} moves in ${res.seconds}s.`, res.sharp ? "Photographic memory unlocked." : "Fewer spare moves earns bonus XP."]}
        xp={res.xp} onAgain={() => newGame()} onExit={onExit} />
    );
  }
  return (
    <div className="stack">
      <Chips options={Object.keys(MEM_DIFF)} value={diff} onChange={pickDiff} render={(k) => `${k[0].toUpperCase() + k.slice(1)} · ${MEM_DIFF[k].pairs} pairs`} />
      <div className="hud"><span><b>{moves}</b> moves</span><span><b>{seconds}</b>s</span><span><b>{matched.length}/{cfg.pairs}</b> pairs</span></div>
      <div className="mem" style={{ "--cols": cfg.cols }}>
        {deck.map((c, i) => {
          const done = matched.includes(c.pair);
          const up = done || open.includes(i);
          return (
            <button key={c.key} className={"mcard" + (up ? " up" : "") + (done ? " done" : "")} onClick={() => flip(i)} aria-label={up ? c.sym : "Hidden tile"}>
              <span className="in"><span className="face back" /><span className="face front">{c.sym}</span></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Tri-Line (Tic Tac Toe) ---- */
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const outcome = (b) => {
  for (const l of LINES) {
    const [a, c, d] = l;
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return { winner: b[a], line: l };
  }
  return b.every(Boolean) ? { winner: null, line: [] } : null;
};
const minimax = (b, turn, ai, depth = 0) => {
  const o = outcome(b);
  if (o) return { score: o.winner === ai ? 10 - depth : o.winner ? depth - 10 : 0, move: -1 };
  let best = { score: turn === ai ? -99 : 99, move: -1 };
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue;
    const nb = [...b]; nb[i] = turn;
    const r = minimax(nb, turn === "X" ? "O" : "X", ai, depth + 1);
    if (turn === ai ? r.score > best.score : r.score < best.score) best = { score: r.score, move: i };
  }
  return best;
};
const aiMove = (b, mode) => {
  const empty = b.map((v, i) => (v ? null : i)).filter((v) => v !== null);
  if (mode === "easy" || (mode === "normal" && Math.random() < 0.5)) return empty[Math.floor(Math.random() * empty.length)];
  return minimax(b, "O", "O").move;
};

function TicTacToe({ onExit }) {
  const { recordGame } = useApp();
  const [mode, setMode] = useState("normal");
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [res, setRes] = useState(null);
  const [score, setScore] = useState({ X: 0, O: 0, D: 0 });
  const [last, setLast] = useState(null);
  const recorded = useRef(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const vsAI = mode !== "local";
  const commit = (b, who) => {
    const o = outcome(b);
    setBoard(b);
    if (!o) { setTurn(who === "X" ? "O" : "X"); return; }
    setRes(o);
    if (recorded.current) return;
    recorded.current = true;
    const won = vsAI && o.winner === "X";
    const lost = vsAI && o.winner === "O";
    const draw = !o.winner;
    let xp = 5;
    if (!vsAI) xp = 10;
    else if (won) xp = { easy: 20, normal: 35, hard: 70 }[mode];
    else if (draw) xp = mode === "hard" ? 30 : 12;
    recordGame("ttt", (s) => ({
      ...s, plays: s.plays + 1, wins: s.wins + (won ? 1 : 0), losses: s.losses + (lost ? 1 : 0),
      draws: s.draws + (draw && vsAI ? 1 : 0),
      hardDraws: s.hardDraws + (draw && mode === "hard" ? 1 : 0),
      hardWins: s.hardWins + (won && mode === "hard" ? 1 : 0),
    }), xp, { win: won });
    setScore((sc) => ({ X: sc.X + (o.winner === "X" ? 1 : 0), O: sc.O + (o.winner === "O" ? 1 : 0), D: sc.D + (draw ? 1 : 0) }));
    setLast(xp);
    Sound.play(draw ? "tick" : won || !vsAI ? "win" : "lose");
    buzz(40);
  };
  const place = (i) => {
    if (board[i] || res) return;
    if (vsAI && turn !== "X") return;
    Sound.play(turn === "X" ? "place" : "place2");
    const nb = [...board]; nb[i] = turn;
    commit(nb, turn);
  };
  useEffect(() => {
    if (!vsAI || res || turn !== "O") return undefined;
    timer.current = setTimeout(() => {
      const m = aiMove(board, mode);
      if (m == null || m < 0) return;
      const nb = [...board]; nb[m] = "O";
      Sound.play("place2");
      commit(nb, "O");
    }, 480);
    return () => clearTimeout(timer.current);
  }, [turn, res, mode, board]); // eslint-disable-line react-hooks/exhaustive-deps

  const round = () => { clearTimeout(timer.current); recorded.current = false; setBoard(Array(9).fill(null)); setTurn("X"); setRes(null); setLast(null); };
  const pickMode = (m) => { Sound.play("click"); setMode(m); setScore({ X: 0, O: 0, D: 0 }); round(); };

  const names = vsAI ? { X: "You", O: "AI" } : { X: "Player X", O: "Player O" };
  let status = vsAI ? (turn === "X" ? "Your move" : "AI is thinking…") : `${names[turn]}'s turn`;
  if (res) status = res.winner ? (vsAI ? (res.winner === "X" ? "You win!" : "The AI wins.") : `${names[res.winner]} wins!`) : "Draw.";

  return (
    <div className="stack">
      <Chips options={["easy", "normal", "hard", "local"]} value={mode} onChange={pickMode} render={(k) => (k === "local" ? "2 players" : k[0].toUpperCase() + k.slice(1))} />
      <div className="hud"><span>{names.X} <b>{score.X}</b></span><span>Draws <b>{score.D}</b></span><span>{names.O} <b>{score.O}</b></span></div>
      <p className="msg center">{status}</p>
      <div className="ttt">
        {board.map((v, i) => (
          <button key={i} className={"cell" + (v ? " " + v : "") + (res && res.line.includes(i) ? " win" : "")} onClick={() => place(i)} aria-label={`Cell ${i + 1} ${v || "empty"}`}>{v}</button>
        ))}
      </div>
      {res && (
        <div className="row center">
          {last != null && <span className="xp-pop"><Zap size={16} /> +{last} XP</span>}
          <button className="btn primary" onClick={round}><RotateCcw size={16} /> Next round</button>
        </div>
      )}
    </div>
  );
}

/* ---- Clash Protocol (Rock Paper Scissors) ---- */
const HANDS = [{ id: "rock", label: "Rock", emoji: "✊" }, { id: "paper", label: "Paper", emoji: "✋" }, { id: "scissors", label: "Scissors", emoji: "✌️" }];
const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };
const emojiOf = (id) => HANDS.find((h) => h.id === id).emoji;

function RpsGame({ onExit }) {
  const { recordGame } = useApp();
  const [phase, setPhase] = useState("choose");
  const [count, setCount] = useState(0);
  const [pick, setPick] = useState(null);
  const [foe, setFoe] = useState(null);
  const [round, setRound] = useState(null);
  const [score, setScore] = useState({ me: 0, ai: 0 });
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [res, setRes] = useState(null);
  const history = useRef([]);
  const timers = useRef([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => { const id = setTimeout(fn, ms); timers.current.push(id); };

  const aiPick = () => {
    const h = history.current;
    if (h.length >= 2 && Math.random() < 0.35) {
      const freq = {};
      h.forEach((x) => { freq[x] = (freq[x] || 0) + 1; });
      const fav = Object.keys(freq).sort((a, b) => freq[b] - freq[a])[0];
      return Object.keys(BEATS).find((k) => BEATS[k] === fav);
    }
    return HANDS[rand(0, 2)].id;
  };
  const finish = (ns, ms) => {
    const won = ns.me >= 3;
    const xp = won ? 40 + ms * 5 : 8;
    recordGame("rps", (s) => ({ ...s, plays: s.plays + 1, wins: s.wins + (won ? 1 : 0), losses: s.losses + (won ? 0 : 1), bestStreak: Math.max(s.bestStreak, ms) }), xp, { win: won });
    Sound.play(won ? "win" : "lose");
    setRes({ won, xp, ns });
    setPhase("over");
  };
  const reveal = (h) => {
    const f = aiPick();
    history.current.push(h);
    setFoe(f);
    const r = h === f ? "draw" : BEATS[h] === f ? "win" : "lose";
    setRound(r); setPhase("reveal");
    const ns = { ...score };
    let st = streak, ms = maxStreak;
    if (r === "win") { ns.me++; st++; ms = Math.max(ms, st); Sound.play("success"); buzz(30); }
    else if (r === "lose") { ns.ai++; st = 0; Sound.play("error"); }
    else Sound.play("tick");
    setScore(ns); setStreak(st); setMaxStreak(ms);
    if (ns.me >= 3 || ns.ai >= 3) later(() => finish(ns, ms), 1300);
    else later(() => { setPhase("choose"); setPick(null); setFoe(null); setRound(null); }, 1400);
  };
  const play = (h) => {
    if (phase !== "choose") return;
    Sound.play("click");
    setPick(h); setFoe(null); setRound(null); setPhase("count"); setCount(1); Sound.play("tick");
    later(() => { setCount(2); Sound.play("tick"); }, 600);
    later(() => { setCount(3); Sound.play("tick"); }, 1200);
    later(() => reveal(h), 1800);
  };
  const again = () => {
    timers.current.forEach(clearTimeout); timers.current = []; history.current = [];
    setPhase("choose"); setPick(null); setFoe(null); setRound(null); setScore({ me: 0, ai: 0 }); setStreak(0); setMaxStreak(0); setRes(null);
  };

  if (res) {
    return (
      <ResultCard tone={res.won ? "win" : "lose"} title={res.won ? "Match won" : "Match lost"}
        lines={[`Final score ${res.ns.me} – ${res.ns.ai}.`, maxStreak >= 2 ? `Best streak: ${maxStreak} rounds.` : "Win rounds in a row for bonus XP."]}
        xp={res.xp} onAgain={again} onExit={onExit} againLabel="Rematch" />
    );
  }
  const words = ["", "Rock…", "Paper…", "Scissors…"];
  const banner = phase === "count" ? words[count] : phase === "reveal" ? (round === "win" ? "You take the round" : round === "lose" ? "AI takes the round" : "Draw") : "Choose your move";
  return (
    <div className="stack">
      <div className="hud">
        <span>You <span className="pips inline">{[0, 1, 2].map((i) => <span key={i} className={i < score.me ? "on" : ""} />)}</span></span>
        <span>AI <span className="pips inline">{[0, 1, 2].map((i) => <span key={i} className={i < score.ai ? "on foe" : ""} />)}</span></span>
      </div>
      <div className="rps-stage">
        <div className={"hand glass" + (phase === "count" ? " shake" : "") + (phase === "reveal" && round === "win" ? " won" : "")}>{phase === "count" ? "✊" : pick ? emojiOf(pick) : "❔"}</div>
        <span className="vs display">VS</span>
        <div className={"hand glass" + (phase === "count" ? " shake" : "") + (phase === "reveal" && round === "lose" ? " won" : "")}>{phase === "count" ? "✊" : foe ? emojiOf(foe) : "❔"}</div>
      </div>
      <p className="msg center">{banner}</p>
      <div className="rps-picks">
        {HANDS.map((h) => (
          <button key={h.id} className="btn pick" disabled={phase !== "choose"} onClick={() => play(h.id)}>
            <span className="em">{h.emoji}</span>{h.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const GAME_COMPONENTS = { reaction: ReactionGame, guess: GuessGame, memory: MemoryGame, ttt: TicTacToe, rps: RpsGame };

/* ============================== 8. PAGES ================================= */

const arenaStat = (id, s) => {
  const st = s.stats[id];
  switch (id) {
    case "reaction": return st.best != null ? `Best average ${st.best} ms` : "No score yet";
    case "guess": return st.plays ? `${st.wins} wins · best ${st.best ?? "–"} tries` : "No score yet";
    case "memory": return st.best.normal != null ? `Best ${st.best.normal} moves (normal)` : "No score yet";
    case "ttt": return st.plays ? `${st.wins}W ${st.losses}L ${st.draws}D` : "No score yet";
    case "rps": return st.plays ? `${st.wins}W ${st.losses}L · best streak ${st.bestStreak}` : "No score yet";
    default: return "";
  }
};

function HomePage() {
  const { state, navigate, toggleFav, catalog } = useApp();
  const heroRef = useRef(null);
  const onMove = (e) => {
    if (e.pointerType && e.pointerType !== "mouse") return;
    const el = heroRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--px", (-((e.clientY - r.top) / r.height - 0.5) * 18).toFixed(1) + "deg");
    el.style.setProperty("--py", (((e.clientX - r.left) / r.width - 0.5) * 22).toFixed(1) + "deg");
  };
  const lvl = levelFromXp(state.xp);
  const fresh = catalog.filter((g) => !g.playable).sort((a, b) => (a.status === "soon") - (b.status === "soon")).slice(0, 3);
  return (
    <div>
      <section className="hero" ref={heroRef} onPointerMove={onMove}>
        <Portal />
        <div className="hero-copy">
          <h1 className="logo display">NEONVERSE</h1>
          <p>Play the games, take on five arcade challenges, earn XP and climb the board with your friends.</p>
          <div className="row center">
            <button className="btn primary lg" onClick={() => navigate("arena")}><Play size={18} /> Enter the arena</button>
            <button className="btn ghost lg" onClick={() => navigate("store")}><ShoppingBag size={18} /> Browse the store</button>
          </div>
        </div>
      </section>

      <section>
        <div className="sec-h"><h2 className="display">Featured games</h2><button className="link" onClick={() => navigate("arena")}>All games <ChevronRight size={16} /></button></div>
        <div className="grid feat">
          {ARENA.map((g) => (
            <Tilt as="button" key={g.id} className="glass game-card" style={{ "--c1": g.c1, "--c2": g.c2 }} onClick={() => navigate("arena", g.id)}>
              <span className="gicon"><g.icon size={26} /></span>
              <span className="gname display">{g.name}</span>
              <span className="gkind">{g.kind}</span>
              <span className="gblurb">{g.blurb}</span>
              <span className="gstat">{arenaStat(g.id, state)}</span>
            </Tilt>
          ))}
        </div>
      </section>

      <section>
        <div className="sec-h"><h2 className="display">Your run</h2><button className="link" onClick={() => navigate("profile")}>Profile <ChevronRight size={16} /></button></div>
        <div className="glass pad run">
          <div className="run-id"><Avatar i={state.profile.avatar} size={56} /><div><b>{state.profile.name}</b><small>Level {lvl} · {rankOf(lvl)}</small></div></div>
          <div className="run-bar"><LevelBar xp={state.xp} /><small>{fmt(state.xp)} / {fmt(xpForLevel(lvl + 1))} XP</small></div>
          <div className="run-tiles"><div><b>{state.totals.plays}</b><small>games</small></div><div><b>{state.totals.wins}</b><small>wins</small></div><div><b>{Object.keys(state.achievements).length}</b><small>achievements</small></div></div>
        </div>
      </section>

      <section>
        <div className="sec-h"><h2 className="display">From the store</h2><button className="link" onClick={() => navigate("store")}>Catalog <ChevronRight size={16} /></button></div>
        <div className="grid feat">
          {fresh.map((g) => (
            <div key={g.id} className="glass store-card slim">
              <div className="art" style={{ "--h": g.hue }}><span>{g.title.slice(0, 2)}</span></div>
              <div className="sc-body">
                <b>{g.title}</b><small>{g.genre} · {tagFor(g)}</small>
                <div className="row">
                  <button className={"icon-btn" + (state.favorites.includes(g.id) ? " on" : "")} aria-label="Favorite" onClick={() => toggleFav(g.id)}><Heart size={18} /></button>
                  <button className="btn small" onClick={() => navigate("store")}>View</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ArenaPage() {
  const { state, activeGame, setActiveGame, navigate } = useApp();
  const game = ARENA.find((g) => g.id === activeGame);
  if (!game) {
    return (
      <div>
        <div className="page-h"><h1 className="display">Gaming arena</h1><p>Pick a challenge. Every finished game pays out XP.</p></div>
        <div className="grid feat">
          {ARENA.map((g) => (
            <Tilt as="button" key={g.id} className="glass game-card" style={{ "--c1": g.c1, "--c2": g.c2 }} onClick={() => navigate("arena", g.id)}>
              <span className="gicon"><g.icon size={26} /></span>
              <span className="gname display">{g.name}</span>
              <span className="gkind">{g.kind}</span>
              <span className="gblurb">{g.blurb}</span>
              <span className="gstat">{arenaStat(g.id, state)}</span>
              <span className="gplay"><Play size={16} /> Play</span>
            </Tilt>
          ))}
        </div>
      </div>
    );
  }
  const Comp = GAME_COMPONENTS[game.id];
  return (
    <div className="game-wrap" style={{ "--c1": game.c1, "--c2": game.c2 }}>
      <div className="game-h">
        <button className="btn ghost small" onClick={() => setActiveGame(null)}><ArrowLeft size={16} /> Arena</button>
        <div><h1 className="display">{game.name}</h1><small>{game.kind}</small></div>
      </div>
      <Comp key={game.id} onExit={() => setActiveGame(null)} />
    </div>
  );
}

function ProfilePage() {
  const { state, updateProfile } = useApp();
  const lvl = levelFromXp(state.xp);
  const base = xpForLevel(lvl), next = xpForLevel(lvl + 1);
  const pct = clamp(((state.xp - base) / (next - base)) * 100, 0, 100);
  const [name, setName] = useState(state.profile.name);
  const [err, setErr] = useState("");
  const st = state.stats;
  const rate = state.totals.plays ? Math.round((state.totals.wins / state.totals.plays) * 100) : 0;
  const saveName = () => {
    const n = name.trim();
    if (n.length < 2 || n.length > 16) { setErr("Use 2 to 16 characters."); Sound.play("error"); return; }
    setErr(""); updateProfile({ name: n }); Sound.play("success");
  };
  const unlocked = Object.keys(state.achievements).length;
  return (
    <div>
      <div className="glass pad prof-head">
        <div className="ring-lvl" style={{ background: `conic-gradient(var(--a3) ${pct}%, rgba(255,255,255,.1) 0)` }}><Avatar i={state.profile.avatar} size={96} /></div>
        <div className="prof-id">
          <h1 className="display">{state.profile.name}</h1>
          <p>Level {lvl} · {rankOf(lvl)}</p>
          <LevelBar xp={state.xp} />
          <small>{fmt(state.xp)} XP · {fmt(next - state.xp)} to level {lvl + 1}</small>
        </div>
      </div>

      <div className="sec-h"><h2 className="display">Statistics</h2></div>
      <div className="tiles">
        <div className="glass tile"><b>{state.totals.plays}</b><span>Games played</span></div>
        <div className="glass tile"><b>{state.totals.wins}</b><span>Wins</span></div>
        <div className="glass tile"><b>{rate}%</b><span>Win rate</span></div>
        <div className="glass tile"><b>{st.reaction.best != null ? st.reaction.best + " ms" : "–"}</b><span>Best reaction</span></div>
        <div className="glass tile"><b>{st.guess.best ?? "–"}</b><span>Fewest guesses</span></div>
        <div className="glass tile"><b>{st.memory.best.normal ?? "–"}</b><span>Memory best (normal)</span></div>
        <div className="glass tile"><b>{st.ttt.wins}/{st.ttt.losses}/{st.ttt.draws}</b><span>Tri-Line W/L/D</span></div>
        <div className="glass tile"><b>{st.rps.bestStreak}</b><span>Best RPS streak</span></div>
      </div>

      <div className="sec-h"><h2 className="display">Achievements</h2><small className="mute">{unlocked} / {ACHIEVEMENTS.length}</small></div>
      <div className="grid ach">
        {ACHIEVEMENTS.map((a) => {
          const got = state.achievements[a.id];
          return (
            <div key={a.id} className={"glass ach-card" + (got ? " got" : "")}>
              <span className="ach-ic">{got ? a.icon : <Lock size={20} />}</span>
              <span><b>{a.name}</b><small>{a.desc}</small><small className="ach-xp">{got ? "Unlocked" : `+${a.xp} XP`}</small></span>
            </div>
          );
        })}
      </div>

      <div className="sec-h"><h2 className="display">Edit player</h2></div>
      <div className="glass pad stack">
        <label className="lbl" htmlFor="pname">Username</label>
        <div className="row">
          <input id="pname" className="input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(); }} />
          <button className="btn primary" onClick={saveName}>Save</button>
        </div>
        {err && <small className="err">{err}</small>}
        <span className="lbl">Avatar</span>
        <div className="avatars">
          {AVATARS.map((_, i) => (
            <button key={i} className={"av-pick" + (state.profile.avatar === i ? " on" : "")} aria-label={`Avatar ${i + 1}`} onClick={() => { updateProfile({ avatar: i }); Sound.play("click"); }}><Avatar i={i} size={48} /></button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BoardPage() {
  const { state } = useApp();
  const [tab, setTab] = useState("xp");
  const [remote, setRemote] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); const r = await Board.fetchAll(); setRemote(r); setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const rows = useMemo(() => {
    const map = new Map();
    remote.forEach((r) => { if (r && r.name) map.set(String(r.name).toLowerCase(), { ...r, remote: true }); });
    const me = { name: state.profile.name || "You", avatar: state.profile.avatar, xp: state.xp, wins: state.totals.wins, reaction: state.stats.reaction.best, isYou: true };
    map.set(me.name.toLowerCase(), me);
    let arr = [...map.values()];
    if (tab === "reaction") arr = arr.filter((r) => r.reaction != null).sort((a, b) => a.reaction - b.reaction);
    else arr.sort((a, b) => (b[tab] || 0) - (a[tab] || 0));
    return arr;
  }, [remote, tab, state.xp, state.profile.name, state.profile.avatar, state.totals.wins, state.stats.reaction.best]);

  const top = rows.slice(0, 10);
  const myIdx = rows.findIndex((r) => r.isYou);
  const metric = (r) => (tab === "xp" ? `${fmt(r.xp)} XP` : tab === "wins" ? `${r.wins || 0} wins` : `${r.reaction} ms`);
  const podium = [top[1], top[0], top[2]];
  const places = [2, 1, 3];
  return (
    <div>
      <div className="page-h"><h1 className="display">Leaderboard</h1><p>Top 10 real players. Climb by earning XP, winning games and cutting your reaction time.</p></div>
      <div className="row between wrap">
        <Chips options={["xp", "wins", "reaction"]} value={tab} onChange={(t) => { Sound.play("click"); setTab(t); }} render={(k) => ({ xp: "Total XP", wins: "Most wins", reaction: "Fastest reaction" }[k])} />
        <button className="btn ghost small" onClick={() => { Sound.play("click"); load(); }}><RotateCcw size={14} /> {loading ? "Syncing…" : "Refresh"}</button>
      </div>
      {top.length === 0 ? (
        <div className="glass pad empty"><p>No scores in this category yet. Finish a Reflex Pulse run to claim the first spot.</p></div>
      ) : (
        <>
          {top.length >= 3 && (
            <div className="podium">
              {podium.map((r, i) => (
                <div key={r.name} className={"pod p" + places[i] + (r.isYou ? " you" : "")}>
                  <Avatar i={r.avatar} size={places[i] === 1 ? 64 : 52} />
                  {places[i] === 1 && <Crown className="crown" size={22} />}
                  <b>{r.name}</b><small>{metric(r)}</small>
                  <span className="pod-base display">{places[i]}</span>
                </div>
              ))}
            </div>
          )}
          <div className="glass list">
            {top.map((r, i) => (
              <div key={r.name} className={"lrow" + (r.isYou ? " you" : "")}>
                <span className="rank display">{i + 1}</span>
                <Avatar i={r.avatar} size={38} />
                <span className="lname"><b>{r.name}{r.isYou ? " (you)" : ""}</b><small>Level {levelFromXp(r.xp)} · {rankOf(levelFromXp(r.xp))}</small></span>
                <span className="lscore">{metric(r)}</span>
              </div>
            ))}
            {myIdx >= 10 && (
              <div className="lrow you sep">
                <span className="rank display">{myIdx + 1}</span><Avatar i={state.profile.avatar} size={38} />
                <span className="lname"><b>{state.profile.name} (you)</b><small>Keep climbing</small></span>
                <span className="lscore">{metric(rows[myIdx])}</span>
              </div>
            )}
            {tab === "reaction" && myIdx === -1 && <div className="lrow sep"><span className="lname"><small>Finish a Reflex Pulse run to appear here.</small></span></div>}
          </div>
        </>
      )}
      {rows.length === 1 && rows[0].isYou && <div className="glass pad empty gap-top"><p>{Board.online ? "You are the only player so far. Share the link with your friends and they will show up here as soon as they play." : "Connect the online ranking (see the README) to compete with your friends."}</p></div>}
      <small className="mute foot">{Board.online ? "Real players only. Everyone who plays NEONVERSE appears here under their username." : "Online ranking is not connected yet, so only your own scores appear here."}</small>
    </div>
  );
}

function GameEditor({ game, onSave, onDelete, onClose }) {
  const isNew = !game;
  const [f, setF] = useState(() => ({
    title: game ? game.title : "", genre: game ? game.genre : "Arcade", tag: game ? game.tag || "" : "",
    url: game ? game.url || "" : "", cta: game ? game.cta || "" : "", status: game ? game.status || "available" : "available",
    hue: game ? game.hue : rand(0, 360), year: game && game.year ? String(game.year) : "",
    feat: game && game.feat ? game.feat.join(", ") : "",
  }));
  const [armed, setArmed] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const save = () => {
    if (!f.title.trim()) { setErr("A title is required."); Sound.play("error"); return; }
    onSave({
      ...(game || {}),
      id: game ? game.id : "g" + Date.now().toString(36),
      title: f.title.trim(), genre: f.genre.trim() || "Other", tag: f.tag.trim(), url: f.url.trim(), cta: f.cta.trim(),
      status: f.status, hue: Number(f.hue), year: f.year ? Number(f.year) : undefined,
      feat: f.feat.split(",").map((x) => x.trim()).filter(Boolean),
    });
  };
  return (
    <Modal onClose={onClose}>
      <div className="art mini" style={{ "--h": f.hue }}><span>{(f.title || "?").slice(0, 2)}</span></div>
      <div className="row between top">
        <h2 className="display">{isNew ? "Add a game" : "Edit game"}</h2>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </div>
      <label className="lbl" htmlFor="ge-title">Title</label>
      <input id="ge-title" className="input" value={f.title} maxLength={40} onChange={set("title")} />
      <label className="lbl" htmlFor="ge-genre">Genre</label>
      <input id="ge-genre" className="input" list="ge-genres" value={f.genre} maxLength={24} onChange={set("genre")} />
      <datalist id="ge-genres">{GENRES.map((g) => <option key={g} value={g} />)}</datalist>
      <label className="lbl" htmlFor="ge-tag">Description</label>
      <textarea id="ge-tag" className="input" rows={3} value={f.tag} maxLength={240} onChange={set("tag")} />
      <label className="lbl" htmlFor="ge-url">Play or download link</label>
      <input id="ge-url" className="input" inputMode="url" placeholder="https://…" value={f.url} onChange={set("url")} />
      <label className="lbl" htmlFor="ge-cta">Button text (optional)</label>
      <input id="ge-cta" className="input" placeholder="Play in browser, Download for Windows…" maxLength={30} value={f.cta} onChange={set("cta")} />
      <label className="lbl" htmlFor="ge-feat">Highlights (separated by commas)</label>
      <input id="ge-feat" className="input" value={f.feat} onChange={set("feat")} />
      <div className="row wrap">
        <select className="select" value={f.status} onChange={set("status")} aria-label="Status">
          <option value="available">Available</option>
          <option value="soon">Coming soon</option>
        </select>
        <input className="input" style={{ maxWidth: 120 }} inputMode="numeric" placeholder="Year" aria-label="Year" value={f.year} onChange={set("year")} />
      </div>
      <label className="lbl" htmlFor="ge-hue">Cover color</label>
      <input id="ge-hue" type="range" min="0" max="360" value={f.hue} onChange={set("hue")} />
      {err && <small className="err">{err}</small>}
      <div className="row between wrap">
        {!isNew ? (
          <button className={"btn small " + (armed ? "danger" : "ghost")} onClick={() => { if (!armed) { setArmed(true); Sound.play("error"); } else onDelete(game.id); }}>
            {armed ? "Tap again to delete" : "Delete"}
          </button>
        ) : <span />}
        <button className="btn primary" onClick={save}>Save game</button>
      </div>
    </Modal>
  );
}

function ExportModal({ list, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);
  const text = "export const CATALOG = " + JSON.stringify(list, null, 2) + ";\n";
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); Sound.play("success"); }
    catch (e) { if (ref.current) { ref.current.focus(); ref.current.select(); } Sound.play("click"); }
  };
  return (
    <Modal onClose={onClose} wide>
      <div className="row between top">
        <h2 className="display">Export catalog</h2>
        <button className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button>
      </div>
      <p className="desc">Replace the content of <b>src/catalog.js</b> on GitHub with this text and commit. Vercel redeploys, and every player sees your catalog.</p>
      <textarea ref={ref} className="input code" readOnly rows={10} value={text} onFocus={(e) => e.target.select()} />
      <button className="btn primary" onClick={copy}>{copied ? "Copied" : "Copy to clipboard"}</button>
    </Modal>
  );
}

function StorePage() {
  const { state, catalog, owner, isDraft, saveCatalog, resetCatalog, toggleFav, toggleNotify, navigate } = useApp();
  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("order");
  const [favOnly, setFavOnly] = useState(false);
  const [open, setOpen] = useState(null);
  const [editing, setEditing] = useState(null);
  const [exporting, setExporting] = useState(false);

  const genres = useMemo(() => [...new Set(catalog.map((x) => x.genre))], [catalog]);
  useEffect(() => { if (genre !== "All" && !genres.includes(genre)) setGenre("All"); }, [genres, genre]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const l = catalog.filter((g) =>
      (genre === "All" || g.genre === genre) &&
      (!favOnly || state.favorites.includes(g.id)) &&
      (!t || g.title.toLowerCase().includes(t) || g.genre.toLowerCase().includes(t)));
    const sorters = {
      order: () => 0,
      az: (a, b) => a.title.localeCompare(b.title),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0),
    };
    return l.sort(sorters[sort]);
  }, [catalog, q, genre, sort, favOnly, state.favorites]);

  const clear = () => { setQ(""); setGenre("All"); setFavOnly(false); Sound.play("click"); };
  const g = open ? catalog.find((x) => x.id === open) : null;
  const upsert = (item) => {
    saveCatalog(catalog.some((x) => x.id === item.id) ? catalog.map((x) => (x.id === item.id ? item : x)) : [item, ...catalog]);
    setEditing(null); Sound.play("success");
  };
  const remove = (id) => { saveCatalog(catalog.filter((x) => x.id !== id)); setEditing(null); Sound.play("click"); };

  return (
    <div>
      <div className="page-h"><h1 className="display">Game store</h1><p>{catalog.length} games. Favorite the ones you like and set launch reminders.</p></div>

      {owner && (
        <div className="glass pad owner-bar">
          <span className="owner-tag"><Crown size={16} /> Owner mode{isDraft ? " · unpublished changes" : ""}</span>
          <div className="row wrap">
            <button className="btn small primary" onClick={() => setEditing("new")}>Add game</button>
            <button className="btn small" onClick={() => setExporting(true)}>Export catalog</button>
            {isDraft && <button className="btn small ghost" onClick={() => { resetCatalog(); Sound.play("click"); }}>Discard local changes</button>}
          </div>
        </div>
      )}

      <div className="glass pad filters">
        <label className="search"><Search size={18} /><input className="input flush" placeholder="Search titles or genres" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <select className="select" value={sort} onChange={(e) => { setSort(e.target.value); Sound.play("click"); }} aria-label="Sort">
          <option value="order">Featured</option><option value="az">Name: A to Z</option><option value="rating">Top rated</option>
        </select>
        <div className="row wrap">
          <button className={"chip" + (favOnly ? " on" : "")} onClick={() => { setFavOnly(!favOnly); Sound.play("click"); }}><Heart size={14} /> Favorites ({state.favorites.length})</button>
        </div>
      </div>
      <div className="chips scroll" role="tablist">
        {["All", ...genres].map((x) => <button key={x} role="tab" aria-selected={genre === x} className={"chip" + (genre === x ? " on" : "")} onClick={() => { setGenre(x); Sound.play("click"); }}>{x}</button>)}
      </div>

      {list.length === 0 ? (
        <div className="glass pad empty"><p>No games match these filters.</p><button className="btn primary" onClick={clear}>Clear filters</button></div>
      ) : (
        <div className="grid store">
          {list.map((x) => (
            <Tilt key={x.id} className="glass store-card">
              <div className="art" style={{ "--h": x.hue }}>
                <span>{x.title.slice(0, 2)}</span>
                {x.playable && <em className="badge">Playable now</em>}
                {!x.playable && x.status === "soon" && <em className="badge">Coming soon</em>}
                <button className={"icon-btn float" + (state.favorites.includes(x.id) ? " on" : "")} aria-label={state.favorites.includes(x.id) ? "Remove favorite" : "Add favorite"} onClick={() => toggleFav(x.id)}><Heart size={18} /></button>
              </div>
              <div className="sc-body">
                <b>{x.title}</b>
                <small>{x.genre}{x.year ? " · " + x.year : ""}</small>
                <div className="row between">
                  {x.rating != null ? <span className="rate"><Star size={14} /> {x.rating.toFixed(1)}</span> : <span />}
                  <span className="price">{tagFor(x)}</span>
                </div>
                <div className="row">
                  <button className="btn small" onClick={() => { setOpen(x.id); Sound.play("click"); }}>Details</button>
                  {owner && <button className="btn small ghost" onClick={() => setEditing(x)}>Edit</button>}
                </div>
              </div>
            </Tilt>
          ))}
        </div>
      )}

      {g && (
        <Modal onClose={() => setOpen(null)}>
          <div className="art banner" style={{ "--h": g.hue }}><span>{g.title.slice(0, 2)}</span></div>
          <div className="row between top">
            <div><h2 className="display">{g.title}</h2><small className="mute">{g.genre}{g.year ? " · " + g.year : ""}{g.rating != null ? " · " + g.rating.toFixed(1) + " / 5" : ""}</small></div>
            <button className="icon-btn" aria-label="Close" onClick={() => setOpen(null)}><X size={18} /></button>
          </div>
          <p className="desc">{g.tag}</p>
          {g.feat && g.feat.length > 0 && <ul className="feat-list">{g.feat.map((f) => <li key={f}><Check size={14} /> {f}</li>)}</ul>}
          <div className="row between wrap">
            <span className="price lg">{tagFor(g)}</span>
            <div className="row wrap">
              <button className={"btn" + (state.favorites.includes(g.id) ? " primary" : " ghost")} onClick={() => toggleFav(g.id)}><Heart size={16} /> {state.favorites.includes(g.id) ? "Favorited" : "Favorite"}</button>
              {g.playable ? (
                <button className="btn primary" onClick={() => { setOpen(null); navigate("arena", g.playable); }}><Play size={16} /> Play now</button>
              ) : g.url ? (
                <a className="btn primary" href={g.url} target="_blank" rel="noopener noreferrer"><Play size={16} /> {g.cta || "Open game"}</a>
              ) : (
                <button className={"btn" + (state.notify.includes(g.id) ? " primary" : " ghost")} onClick={() => toggleNotify(g.id)}><Bell size={16} /> {state.notify.includes(g.id) ? "Reminder set" : "Remind me"}</button>
              )}
              {owner && <button className="btn ghost" onClick={() => { setEditing(g); setOpen(null); }}>Edit</button>}
            </div>
          </div>
        </Modal>
      )}

      {editing && <GameEditor game={editing === "new" ? null : editing} onSave={upsert} onDelete={remove} onClose={() => setEditing(null)} />}
      {exporting && <ExportModal list={catalog} onClose={() => setExporting(false)} />}
    </div>
  );
}

function SettingsPage() {
  const { state, updateSettings, updateProfile, resetAll, navigate, owner, unlockOwner, lockOwner } = useApp();
  const s = state.settings;
  const [code, setCode] = useState("");
  const [codeErr, setCodeErr] = useState("");
  const tryUnlock = () => { if (unlockOwner(code)) { setCode(""); setCodeErr(""); } else { setCodeErr("Wrong code."); Sound.play("error"); } };
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!confirm) return undefined; const id = setTimeout(() => setConfirm(false), 4000); return () => clearTimeout(id); }, [confirm]);
  return (
    <div>
      <div className="page-h"><h1 className="display">Settings</h1><p>Sound, look and feel. Changes save instantly.</p></div>

      <div className="glass pad stack">
        <h3 className="display h3">Sound</h3>
        <Toggle on={s.sound} onChange={(v) => updateSettings({ sound: v })} label="Sound effects" hint="Clicks, wins and level-ups" />
        <div className="slider-row">
          <span className="slider-l">{s.sound ? <Volume2 size={18} /> : <VolumeX size={18} />} Volume <b>{Math.round(s.volume * 100)}%</b></span>
          <input type="range" min="0" max="1" step="0.05" value={s.volume} aria-label="Volume" onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })} onPointerUp={() => Sound.play("success")} />
        </div>
        <Toggle on={s.music} onChange={(v) => updateSettings({ music: v })} label="Ambient music" hint="A quiet generative loop" />
        <button className="btn ghost small fit" onClick={() => Sound.play("win")}><Music size={14} /> Test sound</button>
      </div>

      <div className="glass pad stack gap-top">
        <h3 className="display h3">Theme</h3>
        <div className="themes">
          {Object.entries(THEMES).map(([k, t]) => (
            <button key={k} className={"theme" + (s.theme === k ? " on" : "")} onClick={() => { updateSettings({ theme: k }); Sound.play("nav"); }}>
              <span className="swatch" style={{ background: `linear-gradient(120deg,${t.a3},${t.a2},${t.a1})` }} />
              <b>{t.name}</b>
            </button>
          ))}
        </div>
        <Toggle on={s.effects} onChange={(v) => updateSettings({ effects: v })} label="Animated effects" hint="Moving background, 3D tilt and glows" />
      </div>

      <div className="glass pad stack gap-top">
        <h3 className="display h3">Preferences</h3>
        <Toggle on={s.intro} onChange={(v) => updateSettings({ intro: v })} label="Cinematic intro on launch" hint="Skip the boot sequence when off" />
        <Toggle on={s.haptics} onChange={(v) => updateSettings({ haptics: v })} label="Vibration feedback" hint="Short buzzes on supported phones" />
        <button className="btn ghost small fit" onClick={() => navigate("profile")}><User size={14} /> Edit username and avatar</button>
      </div>

      <div className="glass pad stack gap-top">
        <h3 className="display h3">Owner mode</h3>
        {owner ? (
          <>
            <p className="mute">Owner mode is on. In the store you can add, edit and export your games.</p>
            <div className="row wrap">
              <button className="btn primary small" onClick={() => navigate("store")}>Open the store</button>
              <button className="btn ghost small" onClick={lockOwner}>Lock</button>
            </div>
          </>
        ) : ADMIN_CODE ? (
          <>
            <p className="mute">Enter your owner code to manage the store.</p>
            <div className="row">
              <input className="input" type="password" placeholder="Owner code" value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") tryUnlock(); }} />
              <button className="btn primary" onClick={tryUnlock}>Unlock</button>
            </div>
            {codeErr && <small className="err">{codeErr}</small>}
          </>
        ) : (
          <p className="mute">Owner mode is off. Add a VITE_ADMIN_CODE variable in Vercel to turn it on.</p>
        )}
      </div>

      <div className="glass pad stack gap-top">
        <h3 className="display h3">Data</h3>
        <p className="mute">Resetting clears XP, stats, achievements, favorites and your profile.</p>
        <button className={"btn small fit " + (confirm ? "danger" : "ghost")} onClick={() => { if (!confirm) { setConfirm(true); Sound.play("error"); } else { resetAll(); setConfirm(false); } }}>
          {confirm ? "Tap again to erase everything" : "Reset all progress"}
        </button>
      </div>
    </div>
  );
}

/* ---- Intro & onboarding ---- */
function Intro({ onDone }) {
  const lines = ["Initializing neural link", "Syncing arena servers", "Loading player grid", "Calibrating neon core"];
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setP((v) => Math.min(100, v + Math.random() * 7 + 3)), 110);
    return () => clearInterval(id);
  }, []);
  const ready = p >= 100;
  const enter = () => { Sound.unlock(); Sound.play("level"); onDone(); };
  return (
    <div className="intro">
      <Portal count={11} />
      <button className="skip" onClick={onDone}>Skip</button>
      <div className="intro-in">
        <h1 className="neon display" aria-label="NEONVERSE">
          {"NEONVERSE".split("").map((c, i) => <span key={i} style={{ "--d": i * 0.12 + "s" }}>{c}</span>)}
        </h1>
        <div className="boot"><div className="boot-fill" style={{ width: p + "%" }} /></div>
        <small className="boot-l">{ready ? "Link established" : lines[Math.min(lines.length - 1, Math.floor(p / 26))] + "…"}</small>
        <div className="intro-cta">{ready && <button className="btn primary lg" onClick={enter}><Zap size={18} /> Enter NEONVERSE</button>}</div>
      </div>
    </div>
  );
}

function Onboarding({ onSubmit }) {
  const [name, setName] = useState("Player" + rand(100, 999));
  const [av, setAv] = useState(rand(0, 11));
  const ok = name.trim().length >= 2;
  const go = () => { if (ok) onSubmit(name.trim(), av); };
  return (
    <div className="modal-back solid">
      <div className="modal glass" role="dialog" aria-modal="true">
        <h2 className="display">Create your player</h2>
        <p className="mute">Pick a username and an avatar. You can change both later.</p>
        <label className="lbl" htmlFor="obname">Username</label>
        <input id="obname" className="input" maxLength={16} value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") go(); }} />
        <span className="lbl">Avatar</span>
        <div className="avatars">
          {AVATARS.map((_, i) => (
            <button key={i} className={"av-pick" + (av === i ? " on" : "")} aria-label={`Avatar ${i + 1}`} onClick={() => { setAv(i); Sound.play("click"); }}><Avatar i={i} size={48} /></button>
          ))}
        </div>
        <button className="btn primary lg wide" disabled={!ok} onClick={go}><Play size={18} /> Start playing</button>
      </div>
    </div>
  );
}

/* ============================== 9. APP =================================== */

const NAV = [["home", "Home", Home], ["arena", "Arena", Gamepad2], ["store", "Store", ShoppingBag], ["board", "Ranks", Trophy], ["profile", "Profile", User]];

export default function App() {
  const [state, setState] = useState(null);
  const [booted, setBooted] = useState(false);
  const [page, setPage] = useState("home");
  const [activeGame, setActiveGame] = useState(null);
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);
  const announced = useRef(new Set());
  const prevLvl = useRef(null);
  const loaded = useRef(false);
  const [catalogDraft, setCatalogDraft] = useState(null);
  const [owner, setOwner] = useState(false);

  const pushToast = useCallback((icon, title, text) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, icon, title, text }].slice(-4));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  /* load */
  useEffect(() => {
    let alive = true;
    Storage.load(SAVE_KEY).then((saved) => {
      if (!alive) return;
      const m = mergeState(saved);
      loaded.current = true;
      setState(m);
      setBooted(!m.settings.intro);
    });
    return () => { alive = false; };
  }, []);

  /* owner catalog draft */
  useEffect(() => { Storage.load(CATALOG_KEY).then((c) => { if (Array.isArray(c)) setCatalogDraft(c); }); }, []);

  /* persist (debounced) */
  useEffect(() => {
    if (!state || !loaded.current) return undefined;
    const id = setTimeout(() => Storage.save(SAVE_KEY, state), 250);
    return () => clearTimeout(id);
  }, [state]);

  /* publish to leaderboard */
  const pub = state && state.profile.onboarded ? [state.profile.name, state.profile.avatar, state.xp, state.totals.wins, state.stats.reaction.best] : null;
  useEffect(() => {
    if (!pub) return undefined;
    const id = setTimeout(() => Board.publish({ name: pub[0], avatar: pub[1], xp: pub[2], wins: pub[3], reaction: pub[4] }), 1500);
    return () => clearTimeout(id);
  }, [pub && pub.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  /* apply sound settings and unlock audio on first gesture */
  const settings = state ? state.settings : defaultState().settings;
  useEffect(() => {
    HAPTICS = settings.haptics;
    Sound.configure({ enabled: settings.sound, volume: settings.volume, music: settings.music });
  }, [settings.sound, settings.volume, settings.music, settings.haptics]);
  useEffect(() => {
    const unlock = () => Sound.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  /* achievements */
  useEffect(() => {
    if (!state || !booted) return;
    const fresh = ACHIEVEMENTS.filter((a) => !state.achievements[a.id] && !announced.current.has(a.id) && a.test(state));
    if (!fresh.length) return;
    fresh.forEach((a) => announced.current.add(a.id));
    setState((s) => {
      const ach = { ...s.achievements };
      let bonus = 0;
      fresh.forEach((a) => { if (!ach[a.id]) { ach[a.id] = Date.now(); bonus += a.xp; } });
      return { ...s, achievements: ach, xp: s.xp + bonus };
    });
    fresh.forEach((a, i) => setTimeout(() => { pushToast(a.icon, "Achievement unlocked", `${a.name} · +${a.xp} XP`); Sound.play("success"); }, i * 700));
  }, [state, booted, pushToast]);

  /* level-up */
  const lvl = state ? levelFromXp(state.xp) : null;
  useEffect(() => {
    if (lvl == null) return;
    if (prevLvl.current != null && lvl > prevLvl.current) { Sound.play("level"); pushToast("🚀", `Level ${lvl}`, `New rank: ${rankOf(lvl)}`); buzz([40, 40, 80]); }
    prevLvl.current = lvl;
  }, [lvl, pushToast]);

  /* actions */
  const recordGame = useCallback((id, update, xp, { win = false } = {}) => {
    setState((s) => ({
      ...s, xp: s.xp + xp,
      stats: { ...s.stats, [id]: update(s.stats[id]) },
      totals: { plays: s.totals.plays + 1, wins: s.totals.wins + (win ? 1 : 0) },
    }));
  }, []);
  const toggleFav = useCallback((id) => {
    Sound.play("click");
    setState((s) => ({ ...s, favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] }));
  }, []);
  const toggleNotify = useCallback((id) => {
    Sound.play("success");
    setState((s) => ({ ...s, notify: s.notify.includes(id) ? s.notify.filter((x) => x !== id) : [...s.notify, id] }));
  }, []);
  const updateSettings = useCallback((patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })), []);
  const updateProfile = useCallback((patch) => setState((s) => ({ ...s, profile: { ...s.profile, ...patch } })), []);
  const resetAll = useCallback(() => {
    announced.current = new Set();
    setState((s) => ({ ...defaultState(), settings: s.settings }));
    prevLvl.current = 1;
    setPage("home"); setActiveGame(null);
  }, []);
  const navigate = useCallback((p, game = null) => {
    setPage(p); setActiveGame(game); Sound.play("nav");
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { /* noop */ }
  }, []);
  const saveCatalog = useCallback((list) => { setCatalogDraft(list); Storage.save(CATALOG_KEY, list); }, []);
  const resetCatalog = useCallback(() => { setCatalogDraft(null); Storage.save(CATALOG_KEY, null); }, []);
  const unlockOwner = useCallback((code) => { if (ADMIN_CODE && code === ADMIN_CODE) { setOwner(true); Sound.play("level"); return true; } return false; }, []);
  const lockOwner = useCallback(() => { setOwner(false); Sound.play("click"); }, []);
  const catalog = catalogDraft || BASE_CATALOG;
  const submitOnboarding = (name, avatar) => {
    updateProfile({ name, avatar, onboarded: true });
    Sound.play("level");
    pushToast("👋", `Welcome, ${name}`, "Your adventure starts in the arena.");
  };

  const theme = THEMES[settings.theme] || THEMES.dusk;
  const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const effects = settings.effects && !reduced;
  const rootStyle = { "--a1": theme.a1, "--a2": theme.a2, "--a3": theme.a3, "--hot": theme.hot, "--g1": hexA(theme.a1, 0.5), "--g2": hexA(theme.a2, 0.5), "--g3": hexA(theme.a3, 0.5) };

  const ctx = { state, recordGame, toggleFav, toggleNotify, updateSettings, updateProfile, resetAll, navigate, activeGame, setActiveGame, catalog, owner, isDraft: !!catalogDraft, saveCatalog, resetCatalog, unlockOwner, lockOwner };

  if (!state) {
    return (
      <div className="nv" style={rootStyle}>
        <style>{CSS}</style>
        <Background colors={theme} enabled={false} />
        <div className="loading display">NEONVERSE</div>
      </div>
    );
  }

  const Page = { home: HomePage, arena: ArenaPage, store: StorePage, board: BoardPage, profile: ProfilePage, settings: SettingsPage }[page];
  const p = state.profile;
  return (
    <Ctx.Provider value={ctx}>
      <div className={"nv" + (effects ? "" : " calm")} style={rootStyle}>
        <style>{CSS}</style>
        <Background colors={theme} enabled={effects} />
        <div className="vignette" />

        {!booted && <Intro onDone={() => setBooted(true)} />}
        {booted && !p.onboarded && <Onboarding onSubmit={submitOnboarding} />}

        {booted && (
          <div className="shell">
            <header className="topbar">
              <button className="brand display" onClick={() => navigate("home")} aria-label="NEONVERSE home"><span className="mark" />NEONVERSE</button>
              <nav className="nav" aria-label="Main">
                {NAV.map(([id, label, Icon]) => (
                  <button key={id} className={"nav-btn" + (page === id ? " on" : "")} onClick={() => navigate(id)}><Icon size={17} />{label}</button>
                ))}
              </nav>
              <div className="top-right">
                <button className="chip-player" onClick={() => navigate("profile")} aria-label="Open profile">
                  <Avatar i={p.avatar} size={34} />
                  <span className="cp-text"><b>{p.name}</b><small>Lv {levelFromXp(state.xp)}</small></span>
                </button>
                <button className={"icon-btn" + (page === "settings" ? " on" : "")} aria-label="Settings" onClick={() => navigate("settings")}><SettingsIcon size={19} /></button>
              </div>
            </header>
            <main key={page + (activeGame || "")} className="page">
              <Page />
            </main>
            <nav className="bottom-nav glass" aria-label="Main mobile">
              {NAV.map(([id, label, Icon]) => (
                <button key={id} className={"bn-btn" + (page === id ? " on" : "")} onClick={() => navigate(id)}><Icon size={21} /><small>{label}</small></button>
              ))}
            </nav>
          </div>
        )}
        <Toasts items={toasts} />
      </div>
    </Ctx.Provider>
  );
}

/* ============================== 10. STYLES =============================== */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700;800&family=Sora:wght@400;500;600;700&display=swap');

.nv{--bg:#0d0f17;--ink:#f2f0ff;--mute:#a9a4c9;--line:rgba(255,255,255,.12);
  position:relative;min-height:100dvh;background:var(--bg);color:var(--ink);
  font-family:'Sora',system-ui,-apple-system,'Segoe UI',sans-serif;overflow-x:hidden;-webkit-tap-highlight-color:transparent}
.nv *,.nv *::before,.nv *::after{box-sizing:border-box}
.nv button{font:inherit;color:inherit}
.nv h1,.nv h2,.nv h3,.nv p{margin:0}
.display{font-family:'Outfit','Sora',system-ui,sans-serif;letter-spacing:.01em}
.mute{color:var(--mute)}
.nv :focus-visible{outline:2px solid var(--a3);outline-offset:3px}

.bg-canvas{position:fixed;inset:0;width:100%;height:100%;z-index:0}
.vignette{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(ellipse at center,transparent 55%,rgba(6,7,12,.55))}
.loading{position:fixed;inset:0;display:grid;place-items:center;z-index:5;font-size:1.4rem;letter-spacing:.3em;color:var(--a3);animation:pulse 1.2s ease-in-out infinite}

.shell{position:relative;z-index:2;max-width:1180px;margin:0 auto;padding:0 18px 130px}
.page{animation:pageIn .45s cubic-bezier(.2,.8,.2,1) both}

/* glass + buttons */
.glass{background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03));backdrop-filter:blur(18px) saturate(150%);-webkit-backdrop-filter:blur(18px) saturate(150%);
  border:1px solid var(--line);border-radius:22px;box-shadow:0 22px 50px -26px #000,inset 0 1px 0 rgba(255,255,255,.13)}
.pad{padding:22px}
.stack{display:grid;gap:14px}
.gap-top{margin-top:16px}
.row{display:flex;align-items:center;gap:12px}
.row.center{justify-content:center;flex-wrap:wrap}
.row.between{justify-content:space-between}
.row.wrap{flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid var(--line);background:rgba(255,255,255,.07);padding:11px 18px;border-radius:14px;font-weight:600;font-size:.92rem;cursor:pointer;transition:transform .15s,background .2s,box-shadow .2s}
.btn:hover{transform:translateY(-2px);background:rgba(255,255,255,.12)}
.btn:active{transform:scale(.97)}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none}
.btn.primary{border:0;color:#0d0f17;background:linear-gradient(110deg,var(--a3),var(--a2) 55%,var(--a1));box-shadow:0 10px 30px -10px var(--g2),inset 0 1px 0 rgba(255,255,255,.4)}
.btn.primary:hover{box-shadow:0 14px 36px -8px var(--g3)}
.btn.danger{background:#c7183f;border-color:#ff5c7f}
.btn.small{padding:8px 14px;font-size:.84rem;border-radius:12px}
.btn.lg{padding:14px 24px;font-size:1rem;border-radius:16px}
.btn.wide{width:100%;margin-top:6px}
.btn.fit{width:fit-content}
.link{background:none;border:0;color:var(--a3);cursor:pointer;display:inline-flex;align-items:center;gap:2px;font-weight:600}
.icon-btn{width:40px;height:40px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.06);display:grid;place-items:center;cursor:pointer;transition:transform .15s,color .2s,background .2s}
.icon-btn:hover{transform:scale(1.08)}
.icon-btn.on{color:var(--hot);background:rgba(255,255,255,.12)}
.icon-btn.on svg{fill:var(--hot)}
.input,.select{width:100%;background:rgba(255,255,255,.06);border:1px solid var(--line);border-radius:14px;padding:12px 14px;color:var(--ink);font:inherit}
.input.big{font-size:1.3rem;font-weight:700;text-align:center}
.input.flush{background:none;border:0;padding:0}
.input:focus,.select:focus{outline:2px solid var(--a3);outline-offset:1px}
.select{width:auto;cursor:pointer}
.select option{background:#1a1d2b;color:#fff}
.lbl{font-size:.85rem;color:var(--mute);font-weight:600}
.err{color:#ff7b9b}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.chips.scroll{flex-wrap:nowrap;overflow-x:auto;padding:14px 0 6px;scrollbar-width:none}
.chip{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;padding:8px 14px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.05);cursor:pointer;font-size:.85rem;font-weight:600;transition:background .2s,border-color .2s}
.chip.on{background:linear-gradient(110deg,var(--g3),var(--g1));border-color:var(--a3)}

/* header + nav */
.topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;gap:14px;margin:0 -18px;padding:12px 18px;background:linear-gradient(#0d0f17f0,#0d0f1700);backdrop-filter:blur(10px)}
.brand{display:flex;align-items:center;gap:10px;background:none;border:0;cursor:pointer;font-weight:800;font-size:1.05rem;letter-spacing:.08em}
.mark{width:22px;height:22px;border-radius:7px;background:conic-gradient(var(--a3),var(--a2),var(--a1),var(--hot),var(--a3));animation:spin 8s linear infinite;box-shadow:0 0 18px var(--g1)}
.nav{display:flex;gap:4px;margin-inline:auto}
.nav-btn{display:inline-flex;align-items:center;gap:8px;padding:9px 14px;border-radius:12px;border:0;background:none;color:var(--mute);cursor:pointer;font-weight:600;font-size:.9rem;transition:color .2s,background .2s}
.nav-btn:hover{color:var(--ink)}
.nav-btn.on{color:var(--ink);background:rgba(255,255,255,.09);box-shadow:inset 0 -2px 0 var(--a3)}
.top-right{display:flex;align-items:center;gap:10px;margin-left:auto}
.nav+.top-right{margin-left:0}
.chip-player{display:flex;align-items:center;gap:10px;padding:5px 14px 5px 6px;border-radius:999px;border:1px solid var(--line);background:rgba(255,255,255,.06);cursor:pointer}
.cp-text{display:grid;text-align:left;line-height:1.15}
.cp-text b{font-size:.85rem}
.cp-text small{color:var(--a3);font-weight:700}
.avatar{display:inline-grid;place-items:center;border-radius:32%;flex:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
.bottom-nav{display:none;position:fixed;z-index:40;left:10px;right:10px;bottom:calc(10px + env(safe-area-inset-bottom));padding:6px;border-radius:24px;justify-content:space-around}
.bn-btn{flex:1;display:grid;justify-items:center;gap:2px;padding:8px 2px;border:0;background:none;color:var(--mute);border-radius:16px;cursor:pointer}
.bn-btn small{font-size:.68rem;font-weight:600}
.bn-btn.on{color:var(--a3);background:rgba(255,255,255,.09)}

/* hero */
.hero{position:relative;min-height:min(74vh,620px);display:grid;place-items:center;text-align:center;padding:30px 0 10px}
.hero-copy{position:relative;z-index:2;display:grid;gap:22px;justify-items:center}
.hero-copy p{max-width:44ch;color:var(--mute);line-height:1.65;font-size:1.02rem}
.logo{font-weight:800;font-size:clamp(2rem,9.6vw,6rem);line-height:1;background:linear-gradient(100deg,var(--a3),var(--a2),var(--a1),var(--hot),var(--a3));background-size:300% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sheen 7s linear infinite;filter:drop-shadow(0 0 10px var(--g1))}
.portal{position:absolute;inset:0;display:grid;place-items:center;perspective:700px;pointer-events:none;overflow:hidden}
.portal-in{position:relative;width:min(62vw,400px);aspect-ratio:1;transform-style:preserve-3d;transform:rotateX(var(--px,0deg)) rotateY(var(--py,0deg));transition:transform .35s ease-out}
.ring{position:absolute;inset:0;border-radius:28%;border:2px solid;transform:translateZ(calc(var(--i)*-130px)) rotate(calc(var(--i)*9deg));opacity:calc(.6 - var(--i)*.05);animation:ringSpin 22s linear infinite}
.ring:nth-child(even){animation-direction:reverse}
.ring.r0{border-color:var(--a3);box-shadow:0 0 12px var(--g3),inset 0 0 12px var(--g3)}
.ring.r1{border-color:var(--a2);box-shadow:0 0 12px var(--g2),inset 0 0 12px var(--g2)}
.ring.r2{border-color:var(--a1);box-shadow:0 0 12px var(--g1),inset 0 0 12px var(--g1)}
.core{position:absolute;inset:38%;border-radius:50%;background:radial-gradient(circle,#fff,var(--a3) 35%,transparent 70%);filter:blur(10px);opacity:.45;transform:translateZ(-700px)}

/* sections + grids */
.sec-h{display:flex;align-items:baseline;justify-content:space-between;margin:44px 0 16px}
.sec-h h2{font-size:1.15rem}
.page-h{padding:22px 0 18px;display:grid;gap:8px}
.page-h h1{font-size:clamp(1.5rem,5vw,2.2rem)}
.page-h p{color:var(--mute);max-width:56ch;line-height:1.6}
.grid{display:grid;gap:16px}
.grid.feat{grid-template-columns:repeat(auto-fit,minmax(215px,1fr))}
.grid.store{grid-template-columns:repeat(auto-fill,minmax(210px,1fr));margin-top:6px}
.grid.ach{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.tilt{position:relative;transform:perspective(800px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg));transition:transform .18s ease-out}
.tilt::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .2s;background:radial-gradient(240px circle at var(--mx,50%) var(--my,0%),rgba(255,255,255,.16),transparent 60%)}
.tilt:hover::after{opacity:1}
.game-card{display:grid;gap:8px;padding:20px;text-align:left;cursor:pointer;align-content:start}
.gicon{width:54px;height:54px;border-radius:16px;display:grid;place-items:center;color:#0d0f17;background:linear-gradient(135deg,var(--c1),var(--c2));box-shadow:0 12px 30px -10px var(--c1);margin-bottom:6px}
.gname{font-size:1.02rem;font-weight:800}
.gkind{color:var(--c1);font-weight:600;font-size:.84rem}
.gblurb{color:var(--mute);font-size:.88rem;line-height:1.5}
.gstat{font-size:.8rem;color:var(--ink);opacity:.8;margin-top:4px;padding-top:10px;border-top:1px solid var(--line)}
.gplay{display:inline-flex;align-items:center;gap:6px;color:var(--c1);font-weight:700;font-size:.88rem}
.run{display:grid;grid-template-columns:auto 1fr auto;gap:22px;align-items:center}
.run-id{display:flex;align-items:center;gap:14px}
.run-id div{display:grid}
.run small,.run-bar small{color:var(--mute)}
.run-bar{display:grid;gap:8px}
.run-tiles{display:flex;gap:22px}
.run-tiles div{display:grid;text-align:center}
.run-tiles b{font-family:'Outfit',sans-serif;font-size:1.4rem}
.run-tiles small{color:var(--mute);font-size:.75rem}
.lvlbar{height:9px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}
.lvlbar-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,var(--a3),var(--a2),var(--a1));box-shadow:0 0 14px var(--g3);transition:width .6s cubic-bezier(.2,.8,.2,1)}

/* store */
.art{position:relative;height:130px;border-radius:18px 18px 0 0;overflow:hidden;display:grid;place-items:center;
  background:radial-gradient(circle at 25% 20%,hsl(var(--h) 100% 70% / .55),transparent 55%),linear-gradient(135deg,hsl(var(--h) 85% 45%),hsl(calc(var(--h) + 70) 80% 22%))}
.art::before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(115deg,rgba(255,255,255,.07) 0 2px,transparent 2px 14px)}
.art span{position:relative;font-family:'Outfit',sans-serif;font-weight:800;font-size:2.6rem;color:rgba(255,255,255,.92);text-shadow:0 4px 24px rgba(0,0,0,.5)}
.art.banner{height:170px;border-radius:16px;margin-bottom:16px}
.badge{position:absolute;left:10px;top:10px;font-style:normal;font-size:.7rem;font-weight:700;padding:4px 9px;border-radius:99px;background:#0d0f17cc;color:var(--a3);border:1px solid var(--a3)}
.icon-btn.float{position:absolute;right:10px;top:10px;background:#0d0f1799;backdrop-filter:blur(6px)}
.store-card{overflow:hidden;display:grid}
.store-card.slim{grid-template-columns:96px 1fr}
.store-card.slim .art{height:100%;min-height:110px;border-radius:0}
.store-card.slim .art span{font-size:1.8rem}
.sc-body{display:grid;gap:8px;padding:14px}
.sc-body small{color:var(--mute)}
.rate{display:inline-flex;align-items:center;gap:5px;font-weight:700;font-size:.88rem}
.rate svg{color:#ffd24a;fill:#ffd24a}
.price{font-weight:700;color:var(--a3)}
.price.lg{font-family:'Outfit',sans-serif;font-size:1.3rem}
.filters{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin-bottom:6px}
.filters .row.wrap{grid-column:1/-1}
.search{display:flex;align-items:center;gap:10px;padding:0 14px;border-radius:14px;border:1px solid var(--line);background:rgba(255,255,255,.06);min-height:46px}
.search svg{color:var(--mute);flex:none}
.empty{text-align:center;display:grid;gap:14px;justify-items:center;margin-top:16px;color:var(--mute)}
.modal-back{position:fixed;inset:0;z-index:80;background:rgba(6,7,12,.7);backdrop-filter:blur(6px);display:grid;place-items:center;padding:18px;animation:fade .2s both}
.modal-back.solid{background:rgba(6,7,12,.9);z-index:85}
.modal{width:min(520px,100%);max-height:90dvh;overflow:auto;padding:22px;display:grid;gap:12px;animation:pop .3s cubic-bezier(.2,1.3,.4,1) both;background:linear-gradient(145deg,rgba(30,34,52,.97),rgba(18,20,31,.97))}
.modal .top{align-items:flex-start}
.desc{color:var(--mute);line-height:1.6}
.feat-list{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.feat-list li{display:flex;align-items:center;gap:8px;font-size:.92rem}
.feat-list svg{color:var(--a3)}

/* games shared */
.game-h{display:flex;align-items:center;gap:16px;padding:20px 0 18px}
.game-h h1{font-size:clamp(1.3rem,4.6vw,1.9rem);background:linear-gradient(100deg,var(--c1),var(--c2));-webkit-background-clip:text;background-clip:text;color:transparent}
.game-h small{color:var(--mute)}
.game-wrap{max-width:720px;margin:0 auto}
.msg{font-weight:600;line-height:1.5}
.msg.center{text-align:center}
.hud{display:flex;justify-content:center;gap:22px;flex-wrap:wrap;color:var(--mute);font-size:.92rem}
.hud b{color:var(--ink);font-family:'Outfit',sans-serif;margin-left:4px}
.pips{display:flex;gap:8px;margin-top:14px;justify-content:center}
.pips.inline{display:inline-flex;margin:0 0 0 8px;vertical-align:middle;gap:6px}
.pips span{width:14px;height:14px;border-radius:50%;border:1px solid var(--line);background:rgba(255,255,255,.06);transition:all .25s}
.pips span.on{background:var(--a3);border-color:var(--a3);box-shadow:0 0 12px var(--a3)}
.pips span.on.foe{background:var(--hot);border-color:var(--hot);box-shadow:0 0 12px var(--hot)}
.result{padding:30px 22px;text-align:center;display:grid;gap:14px;justify-items:center;animation:pop .4s cubic-bezier(.2,1.3,.4,1) both}
.result-title{font-size:clamp(1.3rem,5vw,1.9rem);background:linear-gradient(100deg,var(--c1,var(--a3)),var(--c2,var(--a1)));-webkit-background-clip:text;background-clip:text;color:transparent}
.result.lose .result-title{background:none;color:#ff7b9b}
.result p{color:var(--mute);max-width:42ch;line-height:1.6}
.xp-pop{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:99px;font-weight:700;color:#0d0f17;background:linear-gradient(110deg,var(--a3),var(--a1));animation:pop .5s .15s cubic-bezier(.2,1.5,.4,1) both}

/* reaction */
.rx{min-height:340px;border-radius:26px;display:grid;place-items:center;text-align:center;padding:24px;cursor:pointer;user-select:none;touch-action:manipulation;border:1px solid var(--line);transition:background .12s,box-shadow .12s}
.rx h3{font-size:clamp(1.8rem,8vw,3rem);margin-bottom:8px}
.rx p{color:var(--mute)}
.rx.idle,.rx.between,.rx.done{background:linear-gradient(145deg,rgba(255,255,255,.09),rgba(255,255,255,.03))}
.rx.wait{background:linear-gradient(145deg,#5a0f2f,#2a0a3a);box-shadow:inset 0 0 90px #ff3d6e55}
.rx.go{background:linear-gradient(145deg,#12c79b,#25c8f2);box-shadow:inset 0 0 120px #fff6,0 0 60px #25f2ff66;color:#021210}
.rx.go p{color:#021210}
.rx.early{background:#3a1030;box-shadow:inset 0 0 80px #ff4fd855}
.round-chips{display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap}
.rchip{min-width:72px;text-align:center;padding:7px 12px;border-radius:12px;font-size:.84rem;font-weight:600;color:var(--mute);border:1px solid var(--line);background:rgba(255,255,255,.04)}
.rchip.on{color:var(--ink);border-color:var(--a3)}

/* guess */
.range{position:relative;height:10px;border-radius:99px;background:rgba(255,255,255,.1);margin:18px 0 6px;overflow:hidden}
.range-fill{position:absolute;top:0;bottom:0;border-radius:99px;background:linear-gradient(90deg,var(--a3),var(--a1));transition:left .35s,right .35s;min-width:4px}
.range-lbl{display:flex;justify-content:space-between;color:var(--mute);font-size:.8rem;margin-bottom:14px}
.hist{display:flex;flex-wrap:wrap;gap:8px}
.hchip{padding:7px 12px;border-radius:12px;font-weight:700;border:1px solid var(--line);background:rgba(255,255,255,.05);animation:pop .3s both}
.hchip small{font-weight:600;opacity:.8;margin-left:4px}
.hchip.cold{color:#7db8ff}.hchip.warm{color:#ffd24a}.hchip.hot{color:#ff9a3d}.hchip.burning{color:#ff4f6e}

/* memory */
.mem{display:grid;gap:10px;grid-template-columns:repeat(var(--cols),1fr);max-width:560px;width:100%;margin:0 auto}
.mcard{aspect-ratio:1;perspective:600px;border:0;background:none;padding:0;cursor:pointer}
.mcard .in{position:relative;display:block;width:100%;height:100%;transform-style:preserve-3d;transition:transform .45s cubic-bezier(.3,1.4,.5,1)}
.mcard.up .in{transform:rotateY(180deg)}
.face{position:absolute;inset:0;border-radius:14px;display:grid;place-items:center;backface-visibility:hidden;-webkit-backface-visibility:hidden;font-size:clamp(1.1rem,5vw,2.1rem)}
.face.back{background:linear-gradient(135deg,rgba(162,75,255,.4),rgba(61,123,255,.28));border:1px solid var(--line);box-shadow:inset 0 0 20px rgba(255,255,255,.06)}
.face.back::after{content:"";width:34%;aspect-ratio:1;border-radius:30%;border:2px solid var(--a3);opacity:.5;transform:rotate(45deg)}
.face.front{transform:rotateY(180deg);background:rgba(255,255,255,.1);border:1px solid var(--a3)}
.mcard.done .face.front{background:linear-gradient(135deg,var(--g3),var(--g1));box-shadow:0 0 22px var(--g3)}

/* tic tac toe */
.ttt{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;max-width:360px;width:100%;margin:0 auto}
.cell{aspect-ratio:1;border-radius:18px;border:1px solid var(--line);background:rgba(255,255,255,.05);font-family:'Outfit',sans-serif;font-size:clamp(2.2rem,12vw,3.4rem);font-weight:800;cursor:pointer;transition:background .2s,transform .15s}
.cell:hover:not(.X):not(.O){background:rgba(255,255,255,.1);transform:scale(1.03)}
.cell.X{color:var(--a3);text-shadow:0 0 8px var(--g3);animation:pop .25s both}
.cell.O{color:var(--hot);text-shadow:0 0 8px var(--hot);animation:pop .25s both}
.cell.win{background:rgba(255,255,255,.18);animation:pulse .8s ease-in-out infinite}

/* rps */
.rps-stage{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}
.hand{aspect-ratio:1;display:grid;place-items:center;font-size:clamp(3.2rem,16vw,5.6rem);border-radius:26px;transition:box-shadow .25s,transform .25s}
.hand.won{box-shadow:0 0 50px var(--g3),inset 0 0 30px var(--g3);transform:scale(1.05)}
.hand.shake{animation:shake .5s ease-in-out infinite}
.vs{color:var(--mute);font-size:.9rem}
.rps-picks{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.btn.pick{flex-direction:column;padding:16px 8px;gap:6px}
.btn.pick .em{font-size:2.2rem;line-height:1}

/* profile */
.prof-head{display:flex;align-items:center;gap:26px;margin-top:22px}
.ring-lvl{padding:5px;border-radius:36%;flex:none;box-shadow:0 0 40px var(--g3)}
.ring-lvl .avatar{border-radius:33%}
.prof-id{display:grid;gap:8px;flex:1;min-width:0}
.prof-id h1{font-size:clamp(1.3rem,5vw,2rem);overflow-wrap:anywhere}
.prof-id p{color:var(--a3);font-weight:600}
.prof-id small{color:var(--mute)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.tile{padding:16px;display:grid;gap:4px}
.tile b{font-family:'Outfit',sans-serif;font-size:1.35rem}
.tile span{color:var(--mute);font-size:.8rem}
.ach-card{display:flex;gap:14px;padding:16px;align-items:center;opacity:.55}
.ach-card.got{opacity:1;border-color:var(--a3);box-shadow:0 0 26px -10px var(--g3)}
.ach-card span:last-child{display:grid;gap:2px}
.ach-card small{color:var(--mute);font-size:.8rem;line-height:1.4}
.ach-xp{color:var(--a3)!important;font-weight:700}
.ach-ic{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:rgba(255,255,255,.08);font-size:1.4rem;flex:none}
.avatars{display:grid;grid-template-columns:repeat(auto-fill,minmax(54px,1fr));gap:10px}
.av-pick{padding:3px;border-radius:16px;border:2px solid transparent;background:none;cursor:pointer;display:grid;place-items:center;transition:transform .15s}
.av-pick:hover{transform:scale(1.08)}
.av-pick.on{border-color:var(--a3);box-shadow:0 0 18px var(--g3)}

/* leaderboard */
.podium{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:end;margin:26px 0 16px}
.pod{position:relative;display:grid;justify-items:center;gap:4px;text-align:center;padding:16px 8px 0;border-radius:20px 20px 0 0;background:linear-gradient(180deg,rgba(255,255,255,.09),rgba(255,255,255,.02));border:1px solid var(--line);border-bottom:0}
.pod b{font-size:.88rem;overflow-wrap:anywhere}
.pod small{color:var(--mute);font-size:.78rem}
.pod-base{margin-top:10px;width:100%;padding:10px 0;font-weight:800;border-top:1px solid var(--line);background:linear-gradient(180deg,var(--g1),transparent)}
.pod.p1{padding-top:26px}
.pod.p1 .pod-base{padding:20px 0;background:linear-gradient(180deg,var(--g3),transparent)}
.pod.p3 .pod-base{padding:6px 0}
.pod.you{border-color:var(--a3);box-shadow:0 0 28px -8px var(--g3)}
.crown{position:absolute;top:-4px;color:#ffd24a;filter:drop-shadow(0 0 8px #ffd24a)}
.list{display:grid;overflow:hidden}
.lrow{display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid var(--line)}
.lrow:last-child{border-bottom:0}
.lrow.you{background:linear-gradient(90deg,var(--g3),transparent);}
.lrow.sep{border-top:2px dashed var(--line)}
.rank{width:30px;font-size:.95rem;color:var(--a3)}
.lname{display:grid;flex:1;min-width:0}
.lname b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.92rem}
.lname small{color:var(--mute);font-size:.76rem}
.lscore{font-weight:700;font-size:.9rem;white-space:nowrap}
.foot{display:block;margin-top:14px;line-height:1.5}
.row.between.wrap{gap:10px;margin-bottom:6px}

/* settings */
.h3{font-size:.95rem}
.toggle{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:rgba(255,255,255,.04);cursor:pointer;text-align:left}
.toggle-text{display:grid;gap:2px}
.toggle-text small{color:var(--mute)}
.knob{width:46px;height:26px;border-radius:99px;background:rgba(255,255,255,.14);position:relative;flex:none;transition:background .25s}
.knob i{position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .25s cubic-bezier(.3,1.4,.5,1)}
.toggle.on .knob{background:linear-gradient(110deg,var(--a3),var(--a1))}
.toggle.on .knob i{transform:translateX(20px)}
.slider-row{display:grid;gap:10px;padding:4px 2px}
.slider-l{display:flex;align-items:center;gap:8px;font-weight:600;font-size:.92rem}
.slider-l b{margin-left:auto;color:var(--a3)}
.nv input[type=range]{width:100%;accent-color:var(--a3);height:28px}
.themes{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px}
.theme{display:grid;gap:10px;padding:12px;border-radius:16px;border:2px solid var(--line);background:rgba(255,255,255,.04);cursor:pointer;text-align:left}
.theme.on{border-color:var(--a3);box-shadow:0 0 22px -6px var(--g3)}
.swatch{height:34px;border-radius:10px}

/* toasts */
.toasts{position:fixed;z-index:120;top:14px;right:14px;display:grid;gap:10px;width:min(340px,calc(100vw - 28px));pointer-events:none}
.toast{display:flex;gap:12px;align-items:center;padding:12px 14px;animation:toastIn .4s cubic-bezier(.2,1.2,.4,1) both;border-color:var(--a3)}
.toast span:last-child{display:grid}
.toast small{color:var(--mute)}
.toast-ic{font-size:1.5rem}

/* intro */
.intro{position:fixed;inset:0;z-index:90;background:radial-gradient(circle at center,#1a1f33,#0d0f17 70%);display:grid;place-items:center;text-align:center;overflow:hidden}
.intro-in{position:relative;z-index:2;display:grid;gap:18px;justify-items:center;padding:20px;width:min(520px,100%)}
.neon{font-size:clamp(1.7rem,8.2vw,3.8rem);font-weight:800;display:flex;justify-content:center}
.neon span{display:inline-block;color:#fff;opacity:0;text-shadow:0 0 14px var(--g3);animation:letterOn .8s var(--d) both}
.boot{width:100%;height:6px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden}
.boot-fill{height:100%;background:linear-gradient(90deg,var(--a3),var(--a1));box-shadow:0 0 16px var(--a3);transition:width .12s linear}
.boot-l{color:var(--mute);letter-spacing:.04em;min-height:1.2em}
.intro-cta{min-height:56px}
.skip{position:absolute;top:18px;right:18px;z-index:3;background:none;border:1px solid var(--line);border-radius:99px;padding:7px 16px;color:var(--mute);cursor:pointer}

/* keyframes */
@keyframes sheen{to{background-position:300% 0}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes ringSpin{to{transform:translateZ(calc(var(--i)*-130px)) rotate(calc(var(--i)*9deg + 360deg))}}
@keyframes pageIn{from{opacity:0;transform:translateY(14px);filter:blur(6px)}to{opacity:1;transform:none;filter:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}
@keyframes toastIn{from{opacity:0;transform:translateX(30px) scale(.94)}to{opacity:1;transform:none}}
@keyframes shake{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-16px) rotate(-6deg)}75%{transform:translateY(8px) rotate(6deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.55}}
@keyframes scan{to{background-position:0 60px}}
@keyframes letterOn{0%{opacity:0;transform:translateY(16px) scale(.9)}40%{opacity:1}55%{opacity:.15}70%{opacity:1}100%{opacity:1;transform:none}}
@keyframes flicker{0%,18%,22%,62%,64%,100%{opacity:1}20%,63%{opacity:.35}}

/* responsive */
@media (max-width:820px){
  .nav{display:none}
  .top-right{margin-left:auto}
  .bottom-nav{display:flex}
  .cp-text b{display:none}
  .chip-player{padding:4px 12px 4px 4px}
  .run{grid-template-columns:1fr}
  .run-tiles{justify-content:space-between}
  .prof-head{flex-direction:column;text-align:center}
  .filters{grid-template-columns:1fr}
  .toasts{left:50%;right:auto;transform:translateX(-50%)}
}
@media (max-width:520px){
  .shell{padding:0 14px 130px}
  .topbar{margin:0 -14px;padding:10px 14px}
  .pad{padding:16px}
  .grid.feat{grid-template-columns:1fr}
  .grid.store{grid-template-columns:repeat(2,1fr);gap:12px}
  .art{height:100px}
  .art span{font-size:2rem}
  .store-card.slim{grid-template-columns:84px 1fr}
  .rx{min-height:300px}
  .podium{gap:8px}
}

a.btn{color:inherit;text-decoration:none}
a.btn.primary{color:#0d0f17}
textarea.input{resize:vertical}
.input.code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.78rem;line-height:1.5}
.art.mini{height:90px;border-radius:14px}
.owner-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.owner-tag{display:inline-flex;align-items:center;gap:8px;font-weight:700;color:var(--a3)}

/* motion preferences */
.calm .ring,.calm .logo,.calm .scan,.calm .mark,.calm .neon span{animation:none!important}
.calm .neon span{opacity:1}
.calm .tilt{transform:none!important}
@media (prefers-reduced-motion:reduce){
  .ring,.logo,.scan,.mark,.page,.rx,.hand.shake{animation:none!important}
  .neon span{animation:none!important;opacity:1}
  .tilt{transform:none!important}
}
`;
