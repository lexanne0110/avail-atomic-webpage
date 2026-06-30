import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  staticFile,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";

const inter = loadInter().fontFamily;
const geist = loadGeist().fontFamily;

export const FPS = 30;
const DW = 600;
const DH = 647;

// ok-check center (Figma Hero_05): app card top-right corner (compact card 111,323,126,108)
const CHECK_CX = 174;
const CHECK_CY = 269;

// ============================================================================
//  Two motion voices only:
//    SMOOTH — symmetric ease-in-out for position moves and fades
//    OUT    — confident ease-out for entrances, zooms, reveals and the green wipe
// ============================================================================
const SMOOTH = Easing.bezier(0.42, 0, 0.58, 1);
const OUT = Easing.out(Easing.cubic);

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// raw 0..1 progress within a sub-window [a,b] of the beat
const win = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
const pulse = (p: number) => Math.sin(clamp(p) * Math.PI);

const CARD_SHADOW = (f: number, ringGreen: number) =>
  [
    `0 0 0 ${3.4 * f}px rgba(17,185,129,${ringGreen})`,
    `0 ${17.076 * f}px ${34.152 * f}px rgba(21,113,254,0.15)`,
    `0 ${6.404 * f}px ${12.807 * f}px rgba(0,120,247,0.16)`,
    `0 ${1.067 * f}px ${2.135 * f}px rgba(17,52,106,0.04)`,
    `0 0 0 ${7.471 * f}px rgba(255,255,255,0.55)`,
  ].join(", ");

// ---- Poses: a full snapshot of every animated value, per state ----
type Pose = {
  appRing: number;
  kCy: number; kW: number; kH: number; kOp: number; kBest: number; kLock: number;
  pOp: number; dOp: number;
  rOp: number;
  wAop: number; wAgreen: number;
  wRop: number; wRgreen: number;
  fanOp: number;
  check: number;
};
// app is always the compact card at (111,323,126,108); kalkix always x=484.
const POSE = (o: Partial<Pose>): Pose => ({
  appRing: 0,
  kCy: 146, kW: 126, kH: 108, kOp: 0, kBest: 0, kLock: 0,
  pOp: 0, dOp: 0,
  rOp: 0,
  wAop: 0, wAgreen: 0,
  wRop: 0, wRgreen: 0,
  fanOp: 0,
  check: 0,
  ...o,
});

const POSES: Record<string, Pose> = {
  IDLE: POSE({}),
  FAN: POSE({ kOp: 1, pOp: 1, dOp: 1, rOp: 1, wAop: 1, fanOp: 1 }),
  BEST: POSE({ kW: 188, kH: 161, kOp: 1, kBest: 1, pOp: 0.5, dOp: 0.5, rOp: 1, wAop: 1, fanOp: 1 }),
  LOCK: POSE({ kCy: 323.5, kH: 117, kOp: 1, kLock: 1, rOp: 1, wAop: 1, wRop: 1 }),
  GREEN: POSE({ kCy: 323.5, kH: 117, kOp: 1, kLock: 1, rOp: 1, wAop: 1, wAgreen: 1, wRop: 1, wRgreen: 1 }),
  SUCCESS: POSE({ appRing: 1, check: 1, kCy: 323.5, kH: 117, kOp: 0.5, kLock: 1, rOp: 0.5, wAop: 1, wAgreen: 1, wRop: 1, wRgreen: 1 }),
};

// ---- Beats: the sequence. hold = frames showing `from`; dur = transition frames. ----
type Beat = { from: string; to: string; hold: number; dur: number; kind: string };
const BEATS: Beat[] = [
  { from: "IDLE", to: "FAN", hold: 10, dur: 60, kind: "reveal" }, // 2s: line ~1s, fan→options ~1s
  { from: "FAN", to: "BEST", hold: 26, dur: 34, kind: "best" },
  { from: "BEST", to: "LOCK", hold: 22, dur: 36, kind: "lock" },
  { from: "LOCK", to: "GREEN", hold: 18, dur: 30, kind: "green" },
  { from: "GREEN", to: "SUCCESS", hold: 6, dur: 30, kind: "success" },
  { from: "SUCCESS", to: "IDLE", hold: 36, dur: 28, kind: "reset" },
];

const BEAT_LEN = BEATS.map((b) => b.hold + b.dur);
export const TOTAL_FRAMES = BEAT_LEN.reduce((a, b) => a + b, 0);
const BEAT_START = BEAT_LEN.reduce<number[]>((acc, _l, k) => {
  acc.push(k === 0 ? 0 : acc[k - 1] + BEAT_LEN[k - 1]);
  return acc;
}, []);

function timeline(frame: number) {
  const f = ((frame % TOTAL_FRAMES) + TOTAL_FRAMES) % TOTAL_FRAMES;
  let k = 0;
  for (let s = 0; s < BEATS.length; s++) {
    if (f >= BEAT_START[s] && f < BEAT_START[s] + BEAT_LEN[s]) { k = s; break; }
  }
  const b = BEATS[k];
  const localT = f - BEAT_START[k] - b.hold; // negative during the hold
  const p = clamp(localT / b.dur);
  return { b, p };
}

export const HeroAtomic: React.FC = () => {
  const frame = useCurrentFrame();
  const { b, p } = timeline(frame);
  const F = POSES[b.from];
  const T = POSES[b.to];
  const k = b.kind;

  // generic interpolation (SMOOTH) — overridden per beat below
  const m = (key: keyof Pose, t = SMOOTH(p)) => lerp(F[key], T[key], t);

  // app
  const app = { cx: 111, cy: 323, w: 126, h: 108, ring: m("appRing") };
  let checkOp = m("check");

  // kalkix
  const kal = {
    cx: 484,
    cy: m("kCy"),
    w: m("kW"),
    h: m("kH"),
    op: m("kOp"),
    best: m("kBest"),
    lock: m("kLock"),
  };
  const pro = { cx: 484, cy: 322, w: 126, h: 108, op: m("pOp") };
  const dex = { cx: 484, cy: 498, w: 126, h: 108, op: m("dOp") };
  let routerOp = m("rOp");

  // wires
  let wAop = m("wAop"), wAgreen = m("wAgreen"), wAdraw = 1;
  let wRop = m("wRop"), wRgreen = m("wRgreen"), wRdraw = 1;

  // fan
  let fanBranchOp: [number, number, number] = [m("fanOp"), m("fanOp"), m("fanOp")];
  let fanDraw: [number, number, number] = [1, 1, 1];

  // pixels
  let reqP = -1, setP = -1;

  if (k === "reveal") {
    // 1) line draws app → router; request pixel rides it; router fades in
    wAop = OUT(win(p, 0, 0.42));
    wAdraw = OUT(win(p, 0, 0.45));
    routerOp = OUT(win(p, 0.32, 0.6));
    reqP = OUT(win(p, 0.05, 0.45));
    // 2) fan draws router → three options; quotes fade in (second ~1s)
    fanBranchOp = [1, 1, 1];
    fanDraw = [OUT(win(p, 0.5, 0.8)), OUT(win(p, 0.56, 0.84)), OUT(win(p, 0.62, 0.88))];
    kal.op = OUT(win(p, 0.55, 0.86));
    pro.op = OUT(win(p, 0.62, 0.9));
    dex.op = OUT(win(p, 0.68, 0.95));
  } else if (k === "best") {
    kal.w = lerp(F.kW, T.kW, OUT(win(p, 0, 0.85)));
    kal.h = lerp(F.kH, T.kH, OUT(win(p, 0, 0.85)));
    kal.best = OUT(win(p, 0.1, 0.6));
  } else if (k === "lock") {
    kal.w = lerp(F.kW, T.kW, OUT(win(p, 0, 0.45)));
    kal.h = lerp(F.kH, T.kH, OUT(win(p, 0, 0.45)));
    kal.cy = lerp(F.kCy, T.kCy, SMOOTH(win(p, 0.1, 0.62)));
    kal.best = lerp(1, 0, win(p, 0, 0.25));
    kal.lock = OUT(win(p, 0.6, 0.92));
    pro.op = lerp(0.5, 0, win(p, 0, 0.55));
    dex.op = lerp(0.5, 0, win(p, 0, 0.55));
    // router→KalkiX wire draws in as KalkiX arrives; fan hands off
    const settle = OUT(win(p, 0.45, 0.85));
    wRop = settle; wRdraw = settle;
    fanBranchOp = [1 - win(p, 0.4, 0.8), 1 - win(p, 0, 0.45), 1 - win(p, 0.05, 0.45)];
  } else if (k === "green") {
    // green wipe right→left: router→KalkiX leads, app→router lags
    wRgreen = OUT(win(p, 0, 0.55));
    wAgreen = OUT(win(p, 0.3, 0.85));
    setP = OUT(win(p, 0, 0.7)); // green pixel leads the wipe KalkiX → app
  } else if (k === "success") {
    app.ring = OUT(win(p, 0, 0.5));
    checkOp = OUT(win(p, 0.15, 0.6));
    routerOp = lerp(1, 0.5, SMOOTH(win(p, 0.4, 0.95)));
    kal.op = lerp(1, 0.5, SMOOTH(win(p, 0.4, 0.95)));
  }
  // 'reset' uses the generic SMOOTH interpolation (everything fades success → idle)

  return (
    <AbsoluteFill style={{ background: "#0048ff" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: DW, height: DH, transform: "scale(2)", transformOrigin: "top left" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${staticFile("hero-anim-bg.png")})`,
            backgroundSize: "200% auto",
            backgroundPosition: "top left",
            backgroundRepeat: "no-repeat",
            mixBlendMode: "soft-light",
            opacity: 0.18,
          }}
        />

        <Fan branchOp={fanBranchOp} draw={fanDraw} />

        <Wire x={182} w={75} op={wAop} green={wAgreen} draw={wAdraw} drawFrom="left" />
        <Wire x={346} w={67} op={wRop} green={wRgreen} draw={wRdraw} drawFrom="left" />

        {reqP >= 0 && <Pixel x={lerp(174, 300, reqP)} y={323} color="#ffffff" op={pulse(reqP)} />}
        {setP >= 0 && <Pixel x={lerp(421, 174, setP)} y={323} color="#11b981" op={pulse(setP)} />}

        <Router op={routerOp} />

        <QuoteCard s={pro} variant="propamm" name="PropAMM" tag="RFQ" price="1,701.10" />
        <QuoteCard s={dex} variant="dex" name="DEX" tag="AGGREGATOR" price="1,700.30" />
        <QuoteCard s={kal} variant="kalkix" name="KalkiX" tag="CLOB" price="1,702.40" />

        <AppCard s={app} />

        {checkOp > 0.01 && <OkCheck cx={CHECK_CX} cy={CHECK_CY} size={40} op={checkOp} />}
      </div>
    </AbsoluteFill>
  );
};

const Stage: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  op?: number;
  z?: number;
  children: React.ReactNode;
}> = ({ cx, cy, w, h, op = 1, z = 1, children }) => (
  <div
    style={{
      position: "absolute",
      left: cx - w / 2,
      top: cy - h / 2,
      width: w,
      height: h,
      opacity: op,
      zIndex: z,
    }}
  >
    {children}
  </div>
);

const AppCard: React.FC<{ s: any }> = ({ s }) => {
  const f = s.w / 126;
  return (
    <Stage cx={s.cx} cy={s.cy} w={s.w} h={s.h} z={10}>
      <div
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          background: "#fff",
          borderRadius: 12.807 * f,
          boxShadow: CARD_SHADOW(f, s.ring),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6.404 * f,
          padding: 10.673 * f,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 * f }}>
          <img
            src={staticFile("icon-app.png")}
            style={{ width: 16.831 * f, height: 16.831 * f, borderRadius: "50%" }}
          />
          <span
            style={{
              fontFamily: geist,
              fontWeight: 600,
              fontSize: 9.818 * f,
              color: "#1f1f1f",
              letterSpacing: -0.147 * f,
              whiteSpace: "nowrap",
            }}
          >
            Your App
          </span>
        </div>
        <div
          style={{
            background: "#f2f4f8",
            borderRadius: 6.586 * f,
            height: 26 * f,
            display: "flex",
            alignItems: "center",
            padding: `0 ${7 * f}px`,
            fontFamily: inter,
            fontWeight: 500,
            fontSize: 11.291 * f,
            whiteSpace: "nowrap",
          }}
        >
          <span style={{ color: "#0048ff" }}>atomic</span>
          <span style={{ color: "#3b404f" }}>.swap()</span>
        </div>
        <span
          style={{
            fontFamily: inter,
            fontWeight: 500,
            fontSize: 9.818 * f,
            color: "#6b6b6a",
            whiteSpace: "nowrap",
          }}
        >
          1 ETH → USDC
        </span>
      </div>
    </Stage>
  );
};

const QuoteCard: React.FC<{
  s: any;
  variant: "kalkix" | "propamm" | "dex";
  name: string;
  tag: string;
  price: string;
}> = ({ s, variant, name, tag, price }) => {
  if (s.op <= 0.01) return null;
  const f = s.w / 126;
  const iconSize = variant === "kalkix" ? 32 * f : 24 * f;
  const bestOp = variant === "kalkix" ? Math.max(0, Math.min(1, s.best)) : 0;
  const lockOp = variant === "kalkix" ? Math.max(0, Math.min(1, s.lock)) : 0;
  const badgeAmt = Math.max(bestOp, lockOp);
  return (
    <Stage cx={s.cx} cy={s.cy} w={s.w} h={s.h} op={s.op} z={9}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          background: "#fff",
          borderRadius: 12.807 * f,
          boxShadow: CARD_SHADOW(f, 0),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 6 * f,
          padding: 10.673 * f,
          paddingTop: (10.673 + 13.327 * badgeAmt) * f,
          transform: `scale(${0.92 + 0.08 * Math.min(1, s.op)})`,
          transformOrigin: "center center",
        }}
      >
        {bestOp > 0.01 && (
          <Badge bg="#0048ff" f={f} left op={bestOp}>
            BEST
          </Badge>
        )}
        {lockOp > 0.01 && (
          <Badge bg="#0b1020" f={f} op={lockOp}>
            INTENT LOCKED
          </Badge>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 6 * f }}>
          {variant === "kalkix" ? (
            <img
              src={staticFile("icon-kalkix.png")}
              style={{ width: iconSize, height: iconSize, borderRadius: "50%" }}
            />
          ) : (
            <span
              style={{
                width: iconSize,
                height: iconSize,
                borderRadius: "50%",
                background: variant === "dex" ? "#0131ff" : "#002dff",
                flex: "none",
              }}
            />
          )}
          <span style={{ display: "flex", flexDirection: "column", gap: 2 * f }}>
            <span
              style={{
                fontFamily: geist,
                fontWeight: 600,
                fontSize: 11.5 * f,
                color: "#1f1f1f",
                letterSpacing: -0.17 * f,
                whiteSpace: "nowrap",
              }}
            >
              {name}
            </span>
            <span
              style={{
                fontFamily: inter,
                fontWeight: 600,
                fontSize: 8.2 * f,
                color: "#9aa0ae",
                letterSpacing: 0.8 * f,
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </span>
          </span>
        </div>
        <span
          style={{
            fontFamily: geist,
            fontWeight: 600,
            fontSize: 14 * f,
            color: "#141413",
          }}
        >
          {price}
        </span>
        <span
          style={{
            fontFamily: inter,
            fontWeight: 500,
            fontSize: 8.5 * f,
            color: "#9aa0ae",
          }}
        >
          USDC out
        </span>
      </div>
    </Stage>
  );
};

const Badge: React.FC<{
  bg: string;
  f: number;
  op: number;
  left?: boolean;
  children: React.ReactNode;
}> = ({ bg, f, op, left, children }) => (
  <span
    style={{
      position: "absolute",
      top: 9 * f,
      left: left ? 16 * f : 14 * f,
      right: left ? "auto" : 14 * f,
      textAlign: "center",
      background: bg,
      color: "#fff",
      fontFamily: geist,
      fontWeight: 600,
      fontSize: 8.4 * f,
      letterSpacing: 0.5 * f,
      borderRadius: (left ? 7 : 5) * f,
      padding: `${3.5 * f}px ${8 * f}px`,
      whiteSpace: "nowrap",
      opacity: op,
      transform: `translateY(${(1 - op) * -4 * f}px)`,
    }}
  >
    {children}
  </span>
);

const Router: React.FC<{ op: number }> = ({ op }) => (
  <Stage cx={300} cy={323} w={92} h={92} op={op} z={8}>
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background: "#0068ff",
        borderRadius: 18,
        boxShadow: "0 10px 24px rgba(0,26,102,0.35)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: 13,
      }}
    >
      <img
        src={staticFile("logo-mark.svg")}
        style={{ width: 30, height: 30, filter: "brightness(0) invert(1)" }}
      />
      <span style={{ fontFamily: geist, fontWeight: 600, fontSize: 10.5, color: "#fff" }}>
        Avail Atomic
      </span>
      <span
        style={{
          fontFamily: geist,
          fontWeight: 600,
          fontSize: 7,
          color: "rgba(255,255,255,0.7)",
          letterSpacing: 1.2,
        }}
      >
        ROUTER
      </span>
    </div>
  </Stage>
);

const Wire: React.FC<{
  x: number;
  w: number;
  op: number;
  green: number;
  draw: number;
  drawFrom: "left" | "right";
}> = ({ x, w, op, green, draw, drawFrom }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 323 - 1.5,
      width: w,
      height: 3,
      opacity: op,
      zIndex: 7,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity: 1 - green,
        transform: `scaleX(${draw})`,
        transformOrigin: `${drawFrom} center`,
        backgroundImage:
          "repeating-linear-gradient(to right, rgba(255,255,255,0.45) 0 2.5px, transparent 2.5px 7.5px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        top: -1,
        height: 5,
        width: "100%",
        transform: `scaleX(${green})`,
        transformOrigin: "right center",
        background: "#11b981",
        borderRadius: 3,
        boxShadow: green > 0.1 ? "0 0 8px 2px rgba(17,185,129,0.45)" : "none",
      }}
    />
  </div>
);

const FAN_PATHS = [
  "M346 323 H372 a10 10 0 0 0 10 -10 V156 a10 10 0 0 1 10 -10 H421",
  "M346 323 H421",
  "M346 323 H372 a10 10 0 0 1 10 10 V488 a10 10 0 0 0 10 10 H421",
];

const Fan: React.FC<{
  branchOp: [number, number, number];
  draw: [number, number, number];
}> = ({ branchOp, draw }) => (
  <svg
    viewBox="0 0 600 647"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 7 }}
  >
    {FAN_PATHS.map((d, k) => {
      const progress = branchOp[k] * draw[k];
      if (progress <= 0.001) return null;
      return (
        <path
          key={k}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.42)"
          strokeWidth={1.5}
          pathLength={1}
          strokeDasharray="0.018 0.028"
          strokeDashoffset={1 - progress}
          vectorEffect="non-scaling-stroke"
        />
      );
    })}
  </svg>
);

const Pixel: React.FC<{ x: number; y: number; color: string; op: number }> = ({
  x,
  y,
  color,
  op,
}) => {
  const size = 7;
  return (
    <div
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        background: color,
        opacity: op,
        boxShadow: `0 0 7px 1px ${color}`,
        zIndex: 8,
      }}
    />
  );
};

const OkCheck: React.FC<{ cx: number; cy: number; size: number; op?: number }> = ({
  cx,
  cy,
  size,
  op = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: cx - size / 2,
      top: cy - size / 2,
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#11b981",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      opacity: op,
      transform: `scale(${0.5 + 0.5 * op})`,
      zIndex: 20,
    }}
  >
    <span
      style={{
        fontFamily: inter,
        fontWeight: 600,
        fontSize: size * 0.55,
        color: "#fff",
        lineHeight: 1,
      }}
    >
      ✓
    </span>
  </div>
);
