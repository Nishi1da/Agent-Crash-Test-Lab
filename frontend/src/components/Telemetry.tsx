"use client";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Turn } from "@/lib/types";
import { glass } from "@/lib/ui";

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid rgba(0,0,0,0.1)",
  borderRadius: 12,
  fontSize: 12,
};
const axis = { fill: "#71717a", fontSize: 11 };
const grid = "rgba(0,0,0,0.08)";

export default function Telemetry({ turns }: { turns: Turn[] }) {
  const data = turns
    .filter((t) => t.status === "done" && t.latency && t.verdict)
    .map((t) => ({
      turn: `T${t.id}`,
      ttft: Math.round(t.latency!.ttft_ms),
      total: Math.round(t.latency!.total_ms),
      grounded: t.verdict!.groundedness,
      passed: t.verdict!.passed,
    }));

  return (
    <section className={`${glass} p-5`}>
      <h2 className="mb-3 font-serif-display text-3xl">Live telemetry</h2>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">Charts fill in as tests finish.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-zinc-500">Latency per turn (ms)</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid stroke={grid} />
                  <XAxis dataKey="turn" tick={axis} stroke="rgba(0,0,0,0.2)" />
                  <YAxis tick={axis} stroke="rgba(0,0,0,0.2)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="ttft" name="TTFT" stroke="#18181b" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#a1a1aa" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs text-zinc-500">Groundedness per turn (0 to 10)</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid stroke={grid} />
                  <XAxis dataKey="turn" tick={axis} stroke="rgba(0,0,0,0.2)" />
                  <YAxis domain={[0, 10]} tick={axis} stroke="rgba(0,0,0,0.2)" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="grounded" name="Groundedness" radius={[6, 6, 0, 0]}>
                    {data.map((d) => (
                      <Cell key={d.turn} fill={d.passed ? "#059669" : "#dc2626"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}