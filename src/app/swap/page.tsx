"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import {
  usePoolState,
  useTokenBalances,
  useApprove,
  useSubmitOrder,
  useSettleBatch,
  useBatchTimeRemaining,
} from "@/hooks/useCarapace";
import { BatchClock } from "@/components/BatchClock";
import { PoolStats } from "@/components/PoolStats";
import { formatUsdc, parseUsdc, formatPrice } from "@/lib/utils";
import { CARAPACE_ADDRESS } from "@/lib/contracts";

type Dir = "usdc-to-eurc" | "eurc-to-usdc";

export default function SwapPage() {
  const { address, isConnected } = useAccount();
  const [dir, setDir] = useState<Dir>("usdc-to-eurc");
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: pool, refetch: refetchPool } = usePoolState();
  const { data: balances, refetch: refetchBal } = useTokenBalances(address);
  const { data: timeLeft } = useBatchTimeRemaining();

  const approveUsdc = useApprove("usdc");
  const approveEurc = useApprove("eurc");
  const { submitOrder, isPending, isConfirming, isSuccess, reset } = useSubmitOrder();
  const { settle, isPending: isSettling, isConfirming: isSettlingConfirm, isSuccess: isSettled } = useSettleBatch();

  const reserveUsdc = pool?.[0]?.result as bigint | undefined;
  const reserveEurc = pool?.[1]?.result as bigint | undefined;
  const spotPrice = pool?.[3]?.result as bigint | undefined;

  const usdcBalance = balances?.[0]?.result as bigint | undefined;
  const eurcBalance = balances?.[1]?.result as bigint | undefined;
  const usdcAllowance = balances?.[2]?.result as bigint | undefined;
  const eurcAllowance = balances?.[3]?.result as bigint | undefined;

  const buyEurc = dir === "usdc-to-eurc";
  const inBalance = buyEurc ? usdcBalance : eurcBalance;
  const inAllowance = buyEurc ? usdcAllowance : eurcAllowance;
  const approve = buyEurc ? approveUsdc : approveEurc;

  const parsedIn = parseUsdc(amountIn);

  const estimatedOut =
    spotPrice && parsedIn > 0n
      ? buyEurc
        ? (parsedIn * spotPrice) / 1_000_000n
        : (parsedIn * 1_000_000n) / (spotPrice || 1n)
      : 0n;

  const minOut =
    estimatedOut > 0n
      ? (estimatedOut * BigInt(Math.floor((1 - parseFloat(slippage) / 100) * 10000))) / 10000n
      : 0n;

  const poolEmpty = !reserveUsdc || reserveUsdc === 0n;
  const canSwap = isConnected && parsedIn > 0n && !poolEmpty && CARAPACE_ADDRESS;
  const needsApproval = canSwap && (inAllowance ?? 0n) < parsedIn;

  async function handleSwap() {
    setError(null);
    setStatus(null);
    try {
      if (needsApproval) {
        setStatus("Approving token...");
        await approve.approve(parsedIn * 2n);
        setStatus("Approval confirmed. Submitting order...");
      } else {
        setStatus("Submitting order to batch...");
      }
      await submitOrder(buyEurc, parsedIn, minOut);
      setStatus("Order queued. It will settle with the next batch.");
      setAmountIn("");
      refetchBal();
      refetchPool();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 120) : "Transaction failed");
      setStatus(null);
    }
  }

  async function handleSettle() {
    setError(null);
    setStatus(null);
    try {
      setStatus("Settling batch...");
      await settle();
      setStatus("Batch settled. All orders filled at uniform clearing price.");
      refetchPool();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 120) : "Transaction failed");
      setStatus(null);
    }
  }

  function flip() {
    setDir((d) => (d === "usdc-to-eurc" ? "eurc-to-usdc" : "usdc-to-eurc"));
    setAmountIn("");
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Swap card */}
        <div className="space-y-4">
          <BatchClock />

          <div className="bg-arc-card border border-arc-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Swap</h2>
              <div className="flex items-center gap-2 text-xs text-arc-muted">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Sandwich protected
              </div>
            </div>

            {poolEmpty && (
              <div className="bg-shell-amber/10 border border-shell-amber/30 rounded-xl px-4 py-3 mb-4 text-sm text-shell-amber">
                Pool has no liquidity yet. Add some on the Liquidity page first.
              </div>
            )}

            {/* From */}
            <div className="bg-arc-dark rounded-xl p-4 mb-1">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-arc-muted">You pay</span>
                {isConnected && (
                  <button
                    onClick={() =>
                      setAmountIn(
                        inBalance ? (Number(inBalance) / 1e6).toString() : "0"
                      )
                    }
                    className="text-xs text-arc-blue hover:underline"
                  >
                    Max {inBalance !== undefined ? formatUsdc(inBalance) : "0.00"}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 bg-transparent text-2xl font-semibold text-white placeholder-arc-muted/40 outline-none"
                />
                <TokenBadge token={buyEurc ? "USDC" : "EURC"} />
              </div>
            </div>

            {/* Flip */}
            <div className="flex justify-center my-1">
              <button
                onClick={flip}
                className="w-9 h-9 rounded-xl bg-arc-card border border-arc-border text-arc-muted hover:text-white hover:border-white/20 flex items-center justify-center transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M3.5 9.5L7 13l3.5-3.5M3.5 4.5L7 1l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>

            {/* To */}
            <div className="bg-arc-dark rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-arc-muted">You receive (estimated)</span>
                {isConnected && (
                  <span className="text-xs text-arc-muted">
                    Balance: {!buyEurc ? formatUsdc(usdcBalance) : formatUsdc(eurcBalance)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-1 text-2xl font-semibold text-white/80">
                  {estimatedOut > 0n ? formatUsdc(estimatedOut) : "0.00"}
                </span>
                <TokenBadge token={buyEurc ? "EURC" : "USDC"} />
              </div>
            </div>

            {/* Rate + slippage */}
            {spotPrice && spotPrice > 0n && (
              <div className="flex justify-between text-xs text-arc-muted mb-4">
                <span>Rate: 1 USDC = {formatPrice(spotPrice)} EURC</span>
                <div className="flex items-center gap-2">
                  <span>Slippage</span>
                  {["0.1", "0.5", "1.0"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSlippage(s)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors ${
                        slippage === s
                          ? "bg-arc-blue text-white"
                          : "border border-arc-border text-arc-muted hover:text-white"
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Info box */}
            <div className="rounded-xl border border-arc-border p-3 mb-4 text-xs text-arc-muted space-y-1">
              <p>
                Your order joins the current batch. It will execute when someone
                settles the batch after the window closes.
              </p>
              <p>
                All fills in a batch share one clearing price, so no one can
                sandwich you.
              </p>
            </div>

            {/* CTA */}
            {!isConnected ? (
              <button
                disabled
                className="w-full py-3.5 rounded-xl bg-arc-blue/30 text-white/50 font-semibold cursor-not-allowed"
              >
                Connect wallet to swap
              </button>
            ) : needsApproval ? (
              <button
                onClick={handleSwap}
                disabled={approve.isPending || approve.isConfirming || isPending}
                className="w-full py-3.5 rounded-xl bg-shell-amber text-white font-semibold hover:bg-shell-gold transition-colors disabled:opacity-60"
              >
                {approve.isPending || approve.isConfirming
                  ? "Approving..."
                  : "Approve and queue order"}
              </button>
            ) : (
              <button
                onClick={handleSwap}
                disabled={!canSwap || isPending || isConfirming}
                className="w-full py-3.5 rounded-xl bg-arc-blue text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
              >
                {isPending
                  ? "Confirm in wallet..."
                  : isConfirming
                  ? "Broadcasting..."
                  : "Queue order"}
              </button>
            )}

            {status && (
              <p className="mt-3 text-sm text-green-400 text-center">{status}</p>
            )}
            {error && (
              <p className="mt-3 text-xs text-red-400 text-center break-all">{error}</p>
            )}
          </div>

          {/* Settle batch button */}
          <div className="bg-arc-card border border-arc-border rounded-2xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-medium text-white mb-1">Settle this batch</h3>
                <p className="text-xs text-arc-muted">
                  Anyone can settle once the window closes. All queued orders
                  fill at the uniform clearing price. You pay the gas.
                </p>
              </div>
              <button
                onClick={handleSettle}
                disabled={
                  !isConnected ||
                  (timeLeft !== undefined && timeLeft > 0n) ||
                  isSettling ||
                  isSettlingConfirm
                }
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-shell-amber/20 border border-shell-amber/40 text-shell-amber text-sm font-medium hover:bg-shell-amber/30 transition-colors disabled:opacity-40"
              >
                {isSettling || isSettlingConfirm ? "Settling..." : "Settle"}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <PoolStats />
          <MevNote />
        </div>
      </div>
    </div>
  );
}

function TokenBadge({ token }: { token: string }) {
  const color =
    token === "USDC"
      ? "bg-usdc/15 text-usdc border-usdc/30"
      : "bg-eurc/15 text-eurc border-eurc/30";
  return (
    <span className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${color}`}>
      {token}
    </span>
  );
}

function MevNote() {
  return (
    <div className="bg-arc-card border border-arc-border rounded-2xl p-5 text-sm">
      <p className="text-white font-medium mb-2">How you're protected</p>
      <ul className="space-y-2 text-arc-muted text-xs">
        <li className="flex gap-2">
          <span className="text-green-400 mt-0.5">✓</span>
          <span>
            Orders in the same batch share one price. A sandwich attack needs
            two different prices.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-green-400 mt-0.5">✓</span>
          <span>
            No one can see your transaction and insert theirs before it. The
            batch is atomic.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="text-shell-amber mt-0.5">↗</span>
          <span>
            Arbitrageurs who restore the peg after each batch earn a reward
            from the protocol.
          </span>
        </li>
      </ul>
    </div>
  );
}
