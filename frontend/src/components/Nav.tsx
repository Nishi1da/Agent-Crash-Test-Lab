"use client";
import { Play, Square } from "lucide-react";

type Props = {
  running: boolean;
  canRun: boolean;
  onRun: () => void;
  onStop: () => void;
  onConfigure: () => void;
  onLive: () => void;
  onReport: () => void;
};

const link = "rounded-full px-4 py-1.5 text-sm text-zinc-700 transition hover:bg-black/5";

export default function Nav(p: Props) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-[#f4f2ed]/75 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="inline-block h-6 w-6 rounded-full bg-zinc-900" />
        <span className="text-sm font-semibold tracking-tight">Crash-Test Lab</span>
      </div>

      <nav className="hidden items-center gap-1 rounded-full border border-black/10 bg-white/70 p-1 shadow-sm md:flex">
        <button onClick={p.onConfigure} className={link}>Configure</button>
        <button onClick={p.onLive} className={link}>Live run</button>
        <button onClick={p.onReport} className={link}>Report</button>
      </nav>

      {p.running ? (
        <button
          onClick={p.onStop}
          className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
        >
          <Square className="h-3.5 w-3.5" /> Stop
        </button>
      ) : (
        <button
          onClick={p.onRun}
          disabled={!p.canRun}
          className="flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-3.5 w-3.5" /> Run stress test
        </button>
      )}
    </header>
  );
}