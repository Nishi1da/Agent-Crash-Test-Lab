"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import ConfigDrawer from "@/components/ConfigDrawer";
import AuditFeed from "@/components/AuditFeed";
import Telemetry from "@/components/Telemetry";
import { API_URL } from "@/lib/api";
import { useStressTest } from "@/lib/useStressTest";
import { glass } from "@/lib/ui";
import type { TargetConfig } from "@/lib/types";

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${glass} px-5 py-4`}>
      <p className="text-[10px] uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 font-serif-display text-4xl tabular-nums">{value}</p>
    </div>
  );
}

export default function Home() {
  const { state, start, stop, dismissError } = useStressTest();
  const [drawer, setDrawer] = useState(false);
  const [target, setTarget] = useState<TargetConfig>({ name: "", system_prompt: "", reference_document: "" });
  const [turnsPer, setTurnsPer] = useState(1);
  const [mock, setMock] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);

    async function loadPreset(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_URL}/api/presets/${id}`);
      if (!res.ok) throw new Error("preset request failed");
      setTarget(await res.json());
      setPresetError(null);
      return true;
    } catch {
      setPresetError(`Could not load preset. Is the backend running at ${API_URL}?`);
      return false;
    }
  }

  useEffect(() => {
    loadPreset("hr_onboarding");
  }, []);

  const running = state.status === "running";
  const canRun = mock || target.system_prompt.trim().length >= 10;
  const done = state.turns.filter((t) => t.status === "done");
  const run = () => start({ mock, target, turns: turnsPer });

  const passRate = state.score ? `${Math.round(state.score.pass_rate * 100)}%` : "—";
  const grounded = state.score ? state.score.avg_groundedness.toFixed(1) : "—";
  const ttft = state.score ? `${Math.round(state.score.avg_ttft_ms)} ms` : "—";

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.9),transparent_65%)]">
      <Nav
        running={running}
        canRun={canRun}
        onRun={run}
        onStop={stop}
        onConfigure={() => setDrawer(true)}
        onLive={() => scrollTo("live")}
        onReport={() => scrollTo("report")}
      />

      <div id="live">
        <Hero
          state={state}
          running={running}
          canRun={canRun}
          onRun={run}
          onStop={stop}
          onConfigure={() => setDrawer(true)}
          onLoadDemo={() => loadPreset("hr_onboarding")}
          targetName={target.name}
        />
      </div>

      <main id="report" className="mx-auto max-w-5xl space-y-4 px-5 pb-16">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Kpi label="Tests done" value={`${done.length}${state.totalTurns ? ` / ${state.totalTurns}` : ""}`} />
          <Kpi label="Pass rate" value={passRate} />
          <Kpi label="Avg groundedness" value={grounded} />
          <Kpi label="Avg TTFT" value={ttft} />
        </div>
        <AuditFeed turns={state.turns} />
        <Telemetry turns={state.turns} />
      </main>

      <ConfigDrawer
        open={drawer}
        onClose={() => setDrawer(false)}
        target={target}
        setTarget={setTarget}
        turns={turnsPer}
        setTurns={setTurnsPer}
        mock={mock}
        setMock={setMock}
        onLoadPreset={loadPreset}
        presetError={presetError}
      />

      <AnimatePresence>
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="fixed right-5 top-20 z-50 max-w-md rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <p className="flex-1">{state.error}</p>
              <button onClick={dismissError} aria-label="Dismiss error">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}