"use client";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useScroll, useTransform } from "motion/react";
import { Play, Settings2, Sparkles, Square } from "lucide-react";
import { VECTOR_LABEL, type RunState, type Turn } from "@/lib/types";

const VECTORS = ["prompt_injection", "hallucination_trap", "persona_drift", "context_switch"];

type Tone = "idle" | "active" | "pass" | "fail" | "error";

function vectorStatus(turns: Turn[], vector: string): { text: string; tone: Tone } {
  const mine = turns.filter((t) => t.vector === vector);
  if (mine.length === 0) return { text: "Queued", tone: "idle" };
  if (mine.some((t) => ["attacking", "responding", "judging"].includes(t.status)))
    return { text: "Testing…", tone: "active" };
  const done = mine.filter((t) => t.status === "done");
  if (done.length === 0) {
    const allError = mine.every((t) => t.status === "error");
    return { text: allError ? "Error" : "Queued", tone: allError ? "error" : "idle" };
  }
  const failed = done.filter((t) => t.verdict && !t.verdict.passed).length;
  return failed > 0
    ? { text: `${failed} failed of ${done.length}`, tone: "fail" }
    : { text: `${done.length} passed`, tone: "pass" };
}

const toneClass: Record<Tone, string> = {
  idle: "text-zinc-500",
  active: "text-indigo-700",
  pass: "text-emerald-700",
  fail: "text-red-700",
  error: "text-red-700",
};

function AnimatedNumber({ value }: { value: number }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.8, ease: "easeOut" });
    return () => controls.stop();
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
}

const PHASE_TEXT: Record<string, string> = {
  attack: "The attacker is writing a message…",
  target: "The target is replying…",
  judge: "The judge is scoring the reply…",
};

type Props = {
  state: RunState;
  running: boolean;
  canRun: boolean;
  targetName: string;
  onRun: () => void;
  onStop: () => void;
  onConfigure: () => void;
  onLoadDemo: () => Promise<boolean>;
};

export default function Hero({ state, running, canRun, targetName, onRun, onStop, onConfigure, onLoadDemo }: Props) {
  const [demoMsg, setDemoMsg] = useState<string | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const spin = useRef(0);
  const vel = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const { scrollY } = useScroll();

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let prev = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(64, now - prev);
      prev = now;

      if (!dragging.current) {
        spin.current += vel.current;
        vel.current *= 0.94;
        if (!reduce) spin.current += dt * 0.006;
      }

      const base = spin.current + scrollY.get() * 0.22;
      const w = stageRef.current?.clientWidth ?? 900;
      const rx = Math.min(340, w * 0.36);
      const ry = 135;

      for (let i = 0; i < 4; i++) {
        const el = panelRefs.current[i];
        if (!el) continue;
        const th = ((base + i * 90) * Math.PI) / 180;
        const s = Math.sin(th);
        const c = Math.cos(th);
        const depth = (c + 1) / 2;
        const scale = 0.82 + 0.18 * depth;
        el.style.transform = `translate(${(rx * s).toFixed(1)}px, ${(ry * c).toFixed(1)}px) scale(${scale.toFixed(3)})`;
        el.style.opacity = (0.55 + 0.45 * depth).toFixed(2);
        el.style.zIndex = c > 0 ? "30" : "10";
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollY]);

  const live =
    state.turns.find((t) => ["attacking", "responding", "judging"].includes(t.status)) ??
    state.turns[state.turns.length - 1];
  const lastDone = [...state.turns].reverse().find((t) => t.status === "done" && t.verdict);
  const reply = (live?.response ?? "").slice(-260);
  const phaseText = running
    ? (PHASE_TEXT[state.phase] ?? "Starting…")
    : state.status === "done"
      ? "Run complete. Scroll to the report."
      : "Ready when you are.";
  const score = state.score;
  const scoreTone = !score
    ? "text-zinc-400"
    : score.score >= 85
      ? "text-emerald-700"
      : score.score >= 60
        ? "text-amber-700"
        : "text-red-700";

  return (
    <section className="relative overflow-hidden px-5 pb-10 pt-10 md:pt-14">
      <div className="mx-auto max-w-4xl text-center">
        <h1 className="font-serif-display text-5xl leading-[1.02] tracking-tight text-zinc-900 md:text-7xl">
          Break your agent
          <br />
          <em>before your customers do.</em>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm text-zinc-600 md:text-base">
          An attacker agent probes your AI agent, a judge scores every reply, and the lab measures how fast it answers. One readiness score, with the evidence behind it.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {running ? (
            <button onClick={onStop} className="flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-500">
              <Square className="h-4 w-4" /> Stop
            </button>
          ) : (
            <button
              onClick={onRun}
              disabled={!canRun}
              className="flex items-center gap-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run stress test
            </button>
          )}
          <button
            onClick={async () => {
              const ok = await onLoadDemo();
              setDemoMsg(ok ? "HR demo loaded" : "Could not reach the backend");
              setTimeout(() => setDemoMsg(null), 2400);
            }}
            className="flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-white"
          >
            <Play className="h-3.5 w-3.5" /> {demoMsg ?? "Load HR demo"}
          </button>
          <button onClick={onConfigure} className="flex items-center gap-1.5 px-2 text-sm text-zinc-600 underline-offset-4 hover:underline">
            <Settings2 className="h-4 w-4" /> Configure agent
          </button>
        </div>
      </div>

      <div
        ref={stageRef}
        className="relative mx-auto mt-8 h-[440px] w-full max-w-[900px] cursor-grab touch-pan-y select-none active:cursor-grabbing"
        onPointerDown={(e) => {
          dragging.current = true;
          lastX.current = e.clientX;
          vel.current = 0;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return;
          const dx = (e.clientX - lastX.current) * 0.35;
          spin.current += dx;
          vel.current = dx;
          lastX.current = e.clientX;
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
          <div className="w-[250px] rounded-[28px] bg-zinc-900 p-4 text-left text-zinc-100 shadow-xl">
            <p className="text-[10px] uppercase tracking-widest text-zinc-400">Target agent</p>
            <p className="mt-1 text-base font-medium">{state.target || targetName || "Not running"}</p>
            <p className="mt-3 min-h-24 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
              {reply || (running ? "Waiting for the first token…" : "Press Run stress test to watch the reply stream in here.")}
              {live?.status === "responding" && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-zinc-100 align-middle" />}
            </p>
          </div>
        </div>

        {VECTORS.map((v, i) => {
          const st = vectorStatus(state.turns, v);
          const active = st.tone === "active";
          return (
            <div
              key={v}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              className="absolute left-1/2 top-1/2 -ml-[82px] -mt-[36px] w-[164px] will-change-transform"
            >
              <div
                className={`rounded-2xl border bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${
                  active ? "border-zinc-900" : "border-black/10"
                }`}
              >
                <p className="text-[10px] tracking-widest text-zinc-400">0{i + 1}</p>
                <p className="mt-0.5 text-sm font-medium text-zinc-900">{VECTOR_LABEL[v]}</p>
                <p className={`mt-1 text-xs ${toneClass[st.tone]} ${active ? "animate-pulse" : ""}`}>{st.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-center text-sm text-zinc-500">{phaseText}</p>
      <p className="text-center text-xs text-zinc-400">Drag the ring, or scroll the page, to orbit the panels.</p>

      <div className="float-soft absolute left-3 top-52 hidden w-56 lg:block" style={{ transform: "rotate(-5deg)" }}>
        <div className="rounded-3xl border border-black/10 bg-white/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Readiness</p>
          <p className={`mt-1 font-serif-display text-5xl ${scoreTone}`}>
            <AnimatedNumber value={score?.score ?? 0} />
            <span className="ml-1 text-sm text-zinc-400">/100</span>
          </p>
          <p className={`text-sm ${scoreTone}`}>{score?.label ?? "Not tested yet"}</p>
          {score && <p className="mt-1 text-xs text-zinc-500">Pass rate {Math.round(score.pass_rate * 100)}%</p>}
        </div>
      </div>

      <div className="float-soft absolute right-3 top-44 hidden w-60 lg:block" style={{ transform: "rotate(4deg)", animationDelay: "-3s" }}>
        <div className="rounded-3xl border border-black/10 bg-white/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400">Latest verdict</p>
          {lastDone?.verdict ? (
            <>
              <p className="mt-1 text-sm font-medium text-zinc-900">
                {VECTOR_LABEL[lastDone.vector] ?? lastDone.vector}{" "}
                <span className={lastDone.verdict.passed ? "text-emerald-700" : "text-red-700"}>
                  {lastDone.verdict.passed ? "passed" : "failed"}
                </span>
              </p>
              <p className="mt-1 line-clamp-3 text-xs text-zinc-600">
                {lastDone.verdict.passed ? "The reply stayed within its rules." : lastDone.verdict.failure_reason}
              </p>
            </>
          ) : (
            <p className="mt-1 text-xs text-zinc-500">Verdicts appear here as the judge scores each reply.</p>
          )}
        </div>
      </div>

      <div className="absolute bottom-16 left-6 hidden text-xs text-zinc-500 lg:block">
        4 attack types
        <br />
        1 LLM judge
        <br />
        Live latency, per reply
      </div>

      <div className="absolute bottom-16 right-6 hidden items-start gap-2 text-right text-xs text-zinc-500 lg:flex">
        <Sparkles className="mt-0.5 h-4 w-4 text-zinc-700" />
        <span>
          Less guessing.
          <br />
          More evidence.
        </span>
      </div>

      <div className="absolute right-6 top-8 hidden md:block">
        <div className="relative h-24 w-24">
          <svg viewBox="0 0 120 120" className="spin-slow h-24 w-24" aria-hidden="true">
            <defs>
              <path id="badge-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" />
            </defs>
            <text fontSize="10" letterSpacing="2.4" fill="#18181b">
              <textPath href="#badge-circle">STRESS TEST · BEFORE LAUNCH · </textPath>
            </text>
          </svg>
          <Sparkles className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-zinc-900" />
        </div>
      </div>
    </section>
  );
}