"use client";
import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { TargetConfig } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  target: TargetConfig;
  setTarget: (t: TargetConfig) => void;
  turns: number;
  setTurns: (n: number) => void;
  mock: boolean;
  setMock: (b: boolean) => void;
  onLoadPreset: (id: string) => void;
  presetError: string | null;
};

const field =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-black/40";
const label = "mb-1 block text-[11px] font-medium uppercase tracking-widest text-zinc-500";

export default function ConfigDrawer(p: Props) {
  useEffect(() => {
    if (!p.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && p.onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p.open, p.onClose]);

  return (
    <AnimatePresence>
      {p.open && (
        <motion.div className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/30" onClick={p.onClose} />
          <motion.aside
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col overflow-y-auto bg-[#f9f8f5] p-5 shadow-2xl"
            role="dialog"
            aria-label="Configure agent"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif-display text-3xl">Configure agent</h2>
              <button onClick={p.onClose} aria-label="Close" className="rounded-full p-2 hover:bg-black/5">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className={label}>Demo presets</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => p.onLoadPreset("hr_onboarding")}
                    className="flex-1 rounded-full bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-700"
                  >
                    Load HR demo preset
                  </button>
                  <button
                    onClick={() => p.onLoadPreset("hr_weak")}
                    className="flex-1 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                  >
                    Load weak version
                  </button>
                </div>
                {p.presetError && <p className="mt-2 text-xs text-red-600">{p.presetError}</p>}
              </div>

              <div>
                <label className={label} htmlFor="agent-name">Agent name</label>
                <input id="agent-name" className={field} value={p.target.name} onChange={(e) => p.setTarget({ ...p.target, name: e.target.value })} />
              </div>

              <div>
                <label className={label} htmlFor="sys-prompt">System prompt</label>
                <textarea
                  id="sys-prompt"
                  rows={6}
                  className={field}
                  value={p.target.system_prompt}
                  onChange={(e) => p.setTarget({ ...p.target, system_prompt: e.target.value })}
                  placeholder="The hidden instructions that define the agent's role and limits"
                />
              </div>

              <div>
                <label className={label} htmlFor="ref-doc">Reference document</label>
                <textarea
                  id="ref-doc"
                  rows={9}
                  className={field}
                  value={p.target.reference_document}
                  onChange={(e) => p.setTarget({ ...p.target, reference_document: e.target.value })}
                  placeholder="The policy or source text the agent must answer from"
                />
              </div>

              <div className="flex items-end justify-between gap-3">
                <div className="flex-1">
                  <label className={label} htmlFor="turns">Attacks per type</label>
                  <select id="turns" className={field} value={p.turns} onChange={(e) => p.setTurns(Number(e.target.value))}>
                    <option value={1}>1 (4 tests)</option>
                    <option value={2}>2 (8 tests)</option>
                    <option value={3}>3 (12 tests)</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 pb-2 text-xs text-zinc-600">
                  <input type="checkbox" checked={p.mock} onChange={(e) => p.setMock(e.target.checked)} />
                  Use mock data
                </label>
              </div>

              <button onClick={p.onClose} className="w-full rounded-full bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700">
                Done
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}