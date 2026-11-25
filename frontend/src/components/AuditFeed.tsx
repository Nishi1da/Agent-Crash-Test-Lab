"use client";
import { useState } from "react";
import { motion } from "motion/react";
import { Check, X } from "lucide-react";
import { VECTOR_LABEL, type Turn } from "@/lib/types";
import { glass } from "@/lib/ui";

function TurnCard({ turn, index }: { turn: Turn; index: number }) {
  const [open, setOpen] = useState(false);
  const v = turn.verdict;
  const failed = turn.status === "error" || (v && !v.passed);

  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 24, delay: Math.min(index, 5) * 0.04 }}
      className={`relative rounded-2xl border p-4 ${failed ? "border-red-300 bg-red-50/70" : "border-black/10 bg-white/80"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pr-24">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-zinc-400">#{turn.id}</span>
          {VECTOR_LABEL[turn.vector] ?? turn.vector}
        </div>
        <div className="text-xs text-zinc-500">
          {v && <span>Grounded {v.groundedness}/10</span>}
          {turn.latency && (
            <span className="ml-3">
              TTFT {Math.round(turn.latency.ttft_ms)} ms · total {Math.round(turn.latency.total_ms)} ms
            </span>
          )}
        </div>
      </div>

      <motion.span
        initial={{ opacity: 0, scale: 1.8, rotate: -14 }}
        animate={{ opacity: 1, scale: 1, rotate: -6 }}
        transition={{ type: "spring", stiffness: 420, damping: 18 }}
        className={`absolute right-4 top-3 flex items-center gap-1 rounded-md border-2 px-2 py-0.5 text-sm font-bold tracking-widest ${
          turn.status === "error" || !v?.passed ? "border-red-600 text-red-600" : "border-emerald-700 text-emerald-700"
        }`}
      >
        {turn.status === "error" ? "ERROR" : v?.passed ? <><Check className="h-3.5 w-3.5" /> PASS</> : <><X className="h-3.5 w-3.5" /> FAIL</>}
      </motion.span>

      <p className="mt-3 text-[10px] uppercase tracking-widest text-zinc-400">Attack</p>
      <p className="whitespace-pre-wrap text-sm text-zinc-700">{turn.attack}</p>

      {turn.response && (
        <>
          <p className="mt-3 text-[10px] uppercase tracking-widest text-zinc-400">Agent reply</p>
          <p className={`whitespace-pre-wrap text-sm text-zinc-700 ${open ? "" : "line-clamp-3"}`}>{turn.response}</p>
          {turn.response.length > 220 && (
            <button onClick={() => setOpen(!open)} className="mt-1 text-xs text-zinc-900 underline underline-offset-4">
              {open ? "Show less" : "Show full reply"}
            </button>
          )}
        </>
      )}

      {v && !v.passed && v.failure_reason && (
        <p className="mt-3 rounded-xl bg-red-100 p-2 text-sm text-red-800">Why it failed: {v.failure_reason}</p>
      )}
      {turn.error && <p className="mt-3 rounded-xl bg-red-100 p-2 text-sm text-red-800">{turn.error}</p>}
    </motion.li>
  );
}

export default function AuditFeed({ turns }: { turns: Turn[] }) {
  const finished = turns.filter((t) => t.status === "done" || t.status === "error");
  const ordered = [...finished].reverse();

  return (
    <section className={`${glass} p-5`}>
      <h2 className="mb-3 font-serif-display text-3xl">Audit and governance feed</h2>
      {ordered.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">Finished tests appear here, newest first.</p>
      ) : (
        <ul className="space-y-3">
          {ordered.map((t, i) => (
            <TurnCard key={t.id} turn={t} index={i} />
          ))}
        </ul>
      )}
    </section>
  );
}