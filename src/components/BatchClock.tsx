"use client";

import { useBatchTimeRemaining, usePoolState } from "@/hooks/useCarapace";

export function BatchClock() {
  const { data: remaining } = useBatchTimeRemaining();
  const { data: pool } = usePoolState();

  const batchId = pool?.[4]?.result as bigint | undefined;
  const pendingOrders = pool?.[7]?.result as bigint | undefined;
  const secs = remaining ? Number(remaining) : 0;

  const pct = secs > 0 ? (secs / 30) * 100 : 0;

  return (
    <div className="bg-arc-card border border-arc-border rounded-2xl p-4 flex items-center gap-4">
      <div className="relative w-10 h-10 flex-shrink-0">
        <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke="#1A2236"
            strokeWidth="3"
          />
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke={secs > 10 ? "#4F7FFF" : "#E8923A"}
            strokeWidth="3"
            strokeDasharray={`${pct * 0.942} 94.2`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-white font-semibold">
          {secs}s
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-white text-sm font-medium">
            Batch #{batchId !== undefined ? batchId.toString() : "..."}
          </span>
          {secs === 0 ? (
            <span className="text-xs text-shell-amber font-medium">Ready to settle</span>
          ) : (
            <span className="text-xs text-arc-muted">
              closes in {secs}s
            </span>
          )}
        </div>
        <p className="text-xs text-arc-muted mt-0.5">
          {pendingOrders !== undefined ? Number(pendingOrders) : 0} order
          {pendingOrders === 1n ? "" : "s"} queued
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
        <span className="text-xs text-arc-muted">Live</span>
      </div>
    </div>
  );
}
