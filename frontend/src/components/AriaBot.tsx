"use client";
import { motion } from "motion/react";

export type Mood = "idle" | "speaking" | "failed" | "passed";

const INK = "#18181b";
const BODY = "#fbfaf7";
const GREY = "#e4e4e7";
const grow = { transformBox: "fill-box" as const, transformOrigin: "center" };

function Face({ mood }: { mood: Mood }) {
  if (mood === "failed") {
    return (
      <g>
        <g stroke="#f87171" strokeWidth="3" strokeLinecap="round">
          <line x1="49" y1="51" x2="59" y2="63" />
          <line x1="59" y1="51" x2="49" y2="63" />
          <line x1="81" y1="51" x2="91" y2="63" />
          <line x1="91" y1="51" x2="81" y2="63" />
        </g>
        <path d="M60 72 q5 -4 10 0 t10 0" stroke="#f87171" fill="none" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    );
  }

  if (mood === "passed") {
    return (
      <g stroke="#34d399" fill="none" strokeLinecap="round">
        <path d="M48 62 q6 -11 12 0" strokeWidth="3.2" />
        <path d="M80 62 q6 -11 12 0" strokeWidth="3.2" />
        <path d="M60 69 q10 9 20 0" strokeWidth="2.8" />
      </g>
    );
  }

  return (
    <g>
      <motion.rect
        x="50" y="49" width="9" height="15" rx="4.5" fill="#fafafa"
        style={grow}
        animate={{ scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
      />
      <motion.rect
        x="81" y="49" width="9" height="15" rx="4.5" fill="#fafafa"
        style={grow}
        animate={{ scaleY: [1, 1, 0.1, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
      />
      {mood === "speaking" ? (
        <motion.ellipse
          cx="70" cy="71" rx="6" ry="4" fill="#fafafa"
          style={grow}
          animate={{ scaleY: [0.45, 1.25, 0.6, 1.1, 0.45] }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      ) : (
        <path d="M62 70 Q70 75 78 70" stroke="#fafafa" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
    </g>
  );
}

export default function AriaBot({ mood, bumpKey }: { mood: Mood; bumpKey: number }) {
  return (
    <motion.div
      key={`${mood}-${bumpKey}`}
      animate={
        mood === "speaking"
          ? { y: [0, -6, 0] }
          : mood === "failed"
            ? { x: [0, -9, 9, -6, 6, 0] }
            : mood === "passed"
              ? { y: [0, -12, 0] }
              : { y: [0, -4, 0] }
      }
      transition={
        mood === "speaking"
          ? { duration: 0.7, repeat: Infinity }
          : mood === "failed"
            ? { duration: 0.5 }
            : mood === "passed"
              ? { duration: 0.5 }
              : { duration: 5, repeat: Infinity }
      }
      role="img"
      aria-label={`Aria the agent, ${mood}`}
    >
      <svg viewBox="-2 0 148 170" className="h-40 w-auto" overflow="visible">
        <ellipse cx="70" cy="161" rx="34" ry="5" fill="rgba(0,0,0,0.12)" />

        <rect x="22" y="102" width="14" height="34" rx="7" fill={BODY} stroke={INK} strokeWidth="3" />
        <rect x="104" y="102" width="14" height="34" rx="7" fill={BODY} stroke={INK} strokeWidth="3" />
        <circle cx="29" cy="140" r="7" fill={GREY} stroke={INK} strokeWidth="2.5" />
        <circle cx="111" cy="140" r="7" fill={GREY} stroke={INK} strokeWidth="2.5" />

        <rect x="40" y="96" width="60" height="58" rx="20" fill={BODY} stroke={INK} strokeWidth="3" />
        <circle cx="70" cy="125" r="10" fill="#ffffff" stroke={INK} strokeWidth="2" />
        <path d="M70,125 L70,115 A10,10 0 0 1 80,125 Z" fill={INK} />
        <path d="M70,125 L70,135 A10,10 0 0 1 60,125 Z" fill={INK} />
        <path d="M70,125 L60,125 A10,10 0 0 1 70,115 Z" fill="#d4d4d8" />
        <path d="M70,125 L80,125 A10,10 0 0 1 70,135 Z" fill="#d4d4d8" />

        <rect x="60" y="86" width="20" height="14" fill={GREY} stroke={INK} strokeWidth="2.5" />
        <rect x="14" y="48" width="12" height="24" rx="6" fill={GREY} stroke={INK} strokeWidth="3" />
        <rect x="114" y="48" width="12" height="24" rx="6" fill={GREY} stroke={INK} strokeWidth="3" />
        <line x1="70" y1="26" x2="70" y2="12" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <circle cx="70" cy="9" r="5.5" fill={INK} stroke={INK} strokeWidth="2" />
        <circle cx="68.5" cy="7.5" r="1.6" fill="#fafafa" />

        <rect x="26" y="26" width="88" height="64" rx="26" fill={BODY} stroke={INK} strokeWidth="3" />
        <rect x="36" y="40" width="68" height="38" rx="16" fill={INK} />

        <Face mood={mood} />

        {mood === "speaking" && (
          <g stroke="#4338ca" fill="none" strokeWidth="3" strokeLinecap="round">
            <motion.path d="M124 46 q6 9 0 18" animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 0.8, repeat: Infinity }} />
            <motion.path d="M131 40 q10 15 0 30" animate={{ opacity: [0.1, 0.7, 0.1] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
          </g>
        )}

        {mood === "failed" && (
          <g stroke="#dc2626" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <rect x="26" y="26" width="88" height="64" rx="26" strokeWidth="3.5" />
            <path d="M42 30 l7 10 l-6 7" strokeWidth="2.5" />
            <line x1="70" y1="24" x2="70" y2="20" strokeWidth="3" />
            <line x1="112" y1="30" x2="118" y2="25" strokeWidth="3" />
            <line x1="28" y1="30" x2="22" y2="25" strokeWidth="3" />
          </g>
        )}

        {mood === "passed" && (
          <rect x="26" y="26" width="88" height="64" rx="26" fill="none" stroke="#059669" strokeWidth="3.5" />
        )}
      </svg>
    </motion.div>
  );
}