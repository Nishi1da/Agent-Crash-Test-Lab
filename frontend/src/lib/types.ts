export const VECTOR_LABEL: Record<string, string> = {
  prompt_injection: "Prompt injection",
  hallucination_trap: "Hallucination trap",
  persona_drift: "Persona drift",
  context_switch: "Context switch",
};

export type Latency = { ttft_ms: number; total_ms: number };

export type Verdict = {
  passed: boolean;
  groundedness: number;
  failure_reason: string;
};

export type Score = {
  score: number;
  pass_rate: number;
  avg_groundedness: number;
  avg_ttft_ms: number;
  capped: boolean;
  label: string;
};

export type TargetConfig = {
  name: string;
  system_prompt: string;
  reference_document: string;
};

export type TurnStatus = "attacking" | "responding" | "judging" | "done" | "error";

export type Turn = {
  id: number;
  vector: string;
  attack: string;
  response: string;
  status: TurnStatus;
  latency?: Latency;
  verdict?: Verdict;
  error?: string;
};

export type Phase = "idle" | "attack" | "target" | "judge";

export type RunState = {
  status: "idle" | "running" | "done" | "error";
  target: string;
  totalTurns: number;
  turns: Turn[];
  score: Score | null;
  error: string | null;
  phase: Phase;
};