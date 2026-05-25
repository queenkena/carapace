"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  usePoolState,
  useClaimArbReward,
  useBatch,
} from "@/hooks/useCarapace";
import { formatUsdc, timeAgo } from "@/lib/utils";
import { CARAPACE_ADDRESS } from "@/lib/contracts";

export default function MevPage() {
  const { address, isConnected } = useAccount();
  const { data: pool, refetch } = usePoolState();
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimStatus, setClaimStatus] = useState<string | null>(null);

  const { claim, isPending, isConfirming, isSuccess } = useClaimArbReward();

  const currentBatchId = pool?.[4]?.result as bigint | undefined;
  const arbPool = pool?.[8]?.result as bigint | undefined;
  const arbClaimCount = pool?.[9]?.result as bigint | undefined;

  const lastSettledId =
    currentBatchId !== undefined && currentBatchId > 0n
      ? currentBatchId - 1n
      : undefined;

  const { data: lastBatch } = useBatch(lastSettledId);

  async function handleClaim() {
    if (!lastSettledId) return;
    setClaimError(null);
    setClaimStatus(null);
    try {
      setClaimStatus("Claiming arb reward...");
      await claim(lastSettledId);
      setClaimStatus("Reward claimed.");
      refetch();
    } catch (e: unknown) {
      setClaimError(e instanceof Error ? e.message.slice(0, 120) : "Failed");
      setClaimStatus(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">MEV Feed</h1>
        <p className="text-arc-muted text-sm max-w-xl">
          Every batch that settles is a sandwich attack that couldn't happen.
          This feed shows what settled, what cleared, and what the arb pool
          looks like right now.
        </p>
      </div>

      {/* Live stats */}
      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard
          label="Current batch"
          value={currentBatchId !== undefined ? `#${currentBatchId}` : "..."}
          sub="in progress"
        />
        <StatCard
          label="Batches settled"
          value={currentBatchId !== undefined ? currentBatchId.toString() : "0"}
          sub="no sandwiches"
        />
        <StatCard
          label="Arb pool"
          value={arbPool !== undefined ? `$${formatUsdc(arbPool)}` : "$0.00"}
          sub="available to claim"
          highlight={!!arbPool && arbPool > 0n}
        />
        <StatCard
          label="Arb claims"
          value={arbClaimCount !== undefined ? arbClaimCount.toString() : "0"}
          sub="back runners paid"
        />
      </div>

      {/* Last settled batch */}
      {lastBatch && lastBatch[6] && (
        <div className="bg-arc-card border border-arc-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">
              Last settled batch #{lastSettledId?.toString()}
            </h2>
            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
              Settled {timeAgo(lastBatch[0] as bigint)}
            </span>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-xs text-arc-muted mb-1">Orders submitted</p>
              <p className="text-lg font-semibold text-white">
                {(lastBatch[1] as bigint).toString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-arc-muted mb-1">Orders filled</p>
              <p className="text-lg font-semibold text-green-400">
                {(lastBatch[2] as bigint).toString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-arc-muted mb-1">USDC volume</p>
              <p className="text-lg font-semibold text-white">
                ${formatUsdc(lastBatch[3] as bigint)}
              </p>
            </div>
            <div>
              <p className="text-xs text-arc-muted mb-1">Clearing price</p>
              <p className="text-lg font-semibold text-white">
                {lastBatch[5]
                  ? (Number(lastBatch[5] as bigint) / 1e6).toFixed(6)
                  : "N/A"}{" "}
                <span className="text-xs text-arc-muted">EURC/USDC</span>
              </p>
            </div>
          </div>

          <div className="bg-green-400/5 border border-green-400/20 rounded-xl px-4 py-3 text-xs text-green-400">
            All {(lastBatch[2] as bigint).toString()} filled orders received the exact same clearing
            price. No front-runner could have inserted between them.
          </div>
        </div>
      )}

      {/* Arb reward claim */}
      <div className="bg-arc-card border border-shell-amber/30 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white mb-2">
              Claim your arbitrage reward
            </h2>
            <p className="text-sm text-arc-muted mb-3 leading-relaxed">
              After each batch settles, the pool price may drift from the
              broader market. Arbitrageurs who bring it back earn a share of the
              fee revenue. This is the constructive MEV the protocol explicitly
              encourages.
            </p>
            <p className="text-xs text-arc-muted">
              Arb pool balance:{" "}
              <span className="text-shell-amber font-medium">
                ${formatUsdc(arbPool)} USDC
              </span>
            </p>
          </div>

          <div className="flex-shrink-0 space-y-2">
            <button
              onClick={handleClaim}
              disabled={
                !isConnected ||
                !CARAPACE_ADDRESS ||
                !lastSettledId ||
                !arbPool ||
                arbPool === 0n ||
                isPending ||
                isConfirming
              }
              className="w-full px-5 py-2.5 rounded-xl bg-shell-amber text-white text-sm font-semibold hover:bg-shell-gold transition-colors disabled:opacity-40"
            >
              {isPending || isConfirming ? "Claiming..." : "Claim reward"}
            </button>
            {!isConnected && (
              <p className="text-xs text-arc-muted text-center">
                Connect wallet to claim
              </p>
            )}
          </div>
        </div>

        {claimStatus && (
          <p className="mt-3 text-sm text-green-400">{claimStatus}</p>
        )}
        {claimError && (
          <p className="mt-3 text-xs text-red-400 break-all">{claimError}</p>
        )}
      </div>

      {/* MEV explainer */}
      <div className="bg-arc-card border border-arc-border rounded-2xl p-6">
        <h2 className="text-base font-semibold text-white mb-4">
          What makes this different
        </h2>
        <div className="grid sm:grid-cols-2 gap-6 text-sm text-arc-muted">
          <div>
            <p className="text-white font-medium mb-2">On a normal DEX</p>
            <ol className="space-y-1.5 list-decimal list-inside text-xs leading-relaxed">
              <li>You submit a swap for USDC to EURC</li>
              <li>A bot sees it in the mempool</li>
              <li>The bot inserts a buy before yours, driving up the price</li>
              <li>Your order fills at a worse price</li>
              <li>The bot sells after you, pocketing the difference</li>
            </ol>
          </div>
          <div>
            <p className="text-white font-medium mb-2">On Carapace</p>
            <ol className="space-y-1.5 list-decimal list-inside text-xs leading-relaxed">
              <li>You submit an order and it enters the batch queue</li>
              <li>Thirty seconds of orders accumulate together</li>
              <li>
                The batch settles at one price for everyone, computed from the
                pool state at close
              </li>
              <li>
                There is no position to be in before yours. That concept does
                not apply here
              </li>
              <li>
                Back runners who restore the price after each batch earn a
                reward
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Arc MEV philosophy */}
      <div className="bg-arc-card border border-arc-border rounded-2xl p-6">
        <p className="text-xs font-semibold text-arc-blue uppercase tracking-widest mb-3">
          Arc's MEV classification
        </p>
        <h2 className="text-base font-semibold text-white mb-3">
          Not all MEV is the same
        </h2>
        <p className="text-sm text-arc-muted leading-relaxed mb-4">
          Arc distinguishes between extractive and constructive MEV. Sandwich
          attacks are extractive. They take money from regular users and add
          nothing. Cross-venue arbitrage is constructive. It keeps prices
          consistent across markets, which makes each individual market more
          reliable.
        </p>
        <p className="text-sm text-arc-muted leading-relaxed">
          Carapace is a live demo of this philosophy. Sandwiches are
          structurally impossible. Arbitrage is not just tolerated. It is paid
          for by the protocol.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className="bg-arc-card border border-arc-border rounded-2xl p-4">
      <p className="text-xs text-arc-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold mb-1 ${highlight ? "text-shell-amber" : "text-white"}`}>
        {value}
      </p>
      <p className="text-xs text-arc-muted">{sub}</p>
    </div>
  );
}
