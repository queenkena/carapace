"use client";

import { usePoolState } from "@/hooks/useCarapace";
import { formatUsdc, formatPrice } from "@/lib/utils";

export function PoolStats() {
  const { data } = usePoolState();

  const reserveUsdc = data?.[0]?.result as bigint | undefined;
  const reserveEurc = data?.[1]?.result as bigint | undefined;
  const totalShares = data?.[2]?.result as bigint | undefined;
  const spotPrice = data?.[3]?.result as bigint | undefined;
  const arbPool = data?.[8]?.result as bigint | undefined;

  const empty = !reserveUsdc || reserveUsdc === 0n;

  return (
    <div className="bg-arc-card border border-arc-border rounded-2xl p-5">
      <h3 className="text-sm font-medium text-arc-muted mb-4">Pool</h3>
      <div className="space-y-3">
        <Row
          label="USDC reserve"
          value={empty ? "No liquidity" : `$${formatUsdc(reserveUsdc)} USDC`}
        />
        <Row
          label="EURC reserve"
          value={empty ? "No liquidity" : `€${formatUsdc(reserveEurc)} EURC`}
        />
        <div className="border-t border-arc-border pt-3">
          <Row
            label="Spot rate"
            value={empty ? "N/A" : `1 USDC = ${formatPrice(spotPrice)} EURC`}
          />
        </div>
        <Row
          label="Arb pool"
          value={`$${formatUsdc(arbPool)} USDC`}
          highlight={!!arbPool && arbPool > 0n}
        />
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-arc-muted">{label}</span>
      <span className={highlight ? "text-shell-amber font-medium" : "text-white"}>
        {value}
      </span>
    </div>
  );
}
