"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useReducer, useRef } from "react";
import { API_URL } from "./api";
import { streamSse } from "./sse";
import type { RunState, TargetConfig, Turn } from "./types";

const initial: RunState = {
  status: "idle",
  target: "",
  totalTurns: 0,
  turns: [],
  score: null,
  error: null,
  phase: "idle",
};

type Action =
  | { type: "reset" }
  | { type: "event"; name: string; data: any }
  | { type: "fail"; message: string }
  | { type: "stopped" }
  | { type: "finish" }
  | { type: "clear_error" };

function upsert(turns: Turn[], id: number, patch: Partial<Turn>): Turn[] {
  const i = turns.findIndex((t) => t.id === id);
  if (i === -1) {
    return [...turns, { id, vector: "", attack: "", response: "", status: "attacking", ...patch }];
  }
  const next = turns.slice();
  next[i] = { ...next[i], ...patch };
  return next;
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "reset":
      return { ...initial, status: "running" };
    case "fail":
      return { ...state, status: "error", error: action.message, phase: "idle" };
    case "stopped":
      return { ...state, status: "idle", phase: "idle" };
    case "finish":
      return state.status === "running" ? { ...state, status: "done", phase: "idle" } : state;
    case "clear_error":
      return { ...state, error: null };
    case "event": {
      const { name, data: d } = action;
      switch (name) {
        case "run_started":
          return { ...state, target: d.target, totalTurns: d.total_turns };
        case "attack_generating":
          return {
            ...state,
            phase: "attack",
            turns: upsert(state.turns, d.turn_id, { vector: d.vector, status: "attacking" }),
          };
        case "turn_started":
          return {
            ...state,
            phase: "target",
            turns: upsert(state.turns, d.turn_id, {
              vector: d.vector,
              attack: d.attack_prompt,
              status: "responding",
            }),
          };
        case "target_delta": {
          const t = state.turns.find((x) => x.id === d.turn_id);
          return {
            ...state,
            turns: upsert(state.turns, d.turn_id, {
              response: (t?.response ?? "") + d.text,
              status: "responding",
            }),
          };
        }
        case "judge_started":
          return {
            ...state,
            phase: "judge",
            turns: upsert(state.turns, d.turn_id, { status: "judging" }),
          };
        case "turn_completed":
          return {
            ...state,
            turns: upsert(state.turns, d.turn_id, {
              vector: d.vector,
              attack: d.attack_prompt,
              response: d.target_response,
              latency: d.latency,
              verdict: d.verdict,
              status: "done",
            }),
          };
        case "score_updated":
          return { ...state, score: d };
        case "turn_error":
          return {
            ...state,
            turns: upsert(state.turns, d.turn_id, { status: "error", error: d.message }),
          };
        case "error":
          return { ...state, status: "error", error: d.message, phase: "idle" };
        case "run_completed":
          return {
            ...state,
            status: state.status === "error" ? "error" : "done",
            phase: "idle",
            score: d.score ?? state.score,
          };
        default:
          return state;
      }
    }
  }
}

export function useStressTest() {
  const [state, dispatch] = useReducer(reducer, initial);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (opts: { mock: boolean; target: TargetConfig; turns: number }) => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      dispatch({ type: "reset" });

      const onEvent = (name: string, data: any) => dispatch({ type: "event", name, data });

      try {
        if (opts.mock) {
          await streamSse(
            `${API_URL}/api/stress-test/mock?delay=0.05`,
            { method: "GET" },
            onEvent,
            ctrl.signal,
          );
        } else {
          await streamSse(
            `${API_URL}/api/stress-test`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ target: opts.target, turns_per_vector: opts.turns }),
            },
            onEvent,
            ctrl.signal,
          );
        }
        dispatch({ type: "finish" });
      } catch (e) {
        if (ctrl.signal.aborted) return;
        const message =
          e instanceof TypeError
            ? `Cannot reach the backend at ${API_URL}. Is uvicorn running?`
            : e instanceof Error
              ? e.message
              : "Unknown error";
        dispatch({ type: "fail", message });
      }
    },
    [],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "stopped" });
  }, []);

  const dismissError = useCallback(() => dispatch({ type: "clear_error" }), []);

  return { state, start, stop, dismissError };
}