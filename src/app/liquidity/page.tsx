"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import {
  usePoolState,
  useTokenBalances,
  useUserShares,
  useApprove,
  useAddLiquidity,
  useRemoveLiquidity,
} from "@/hooks/useCarapace";
import { PoolStats } from "@/components/PoolStats";
import { formatUsdc, parseUsdc } from "@/lib/utils";
import { CARAPACE_ADDRESS } from "@/lib/contracts";

type Tab = "add" | "remove";

export default function LiquidityPage() {
  const { address, isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("add");
  const [usdcAmount, setUsdcAmount] = useState("");
  const [eurcAmount, setEurcAmount] = useState("");
  const [removeShares, setRemoveShares] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: pool, refetch: refetchPool } = usePoolState();
  const { data: balances, refetch: refetchBal } = useTokenBalances(address);
  const { data: userShares, refetch: refetchShares } = useUserShares(address);

  const approveUsdc = useApprove("usdc");
  const approveEurc = useApprove("eurc");
  const { addLiquidity, isPending: isAdding, isConfirming: isAddConfirm } = useAddLiquidity();
  const { removeLiquidity, isPending: isRemoving, isConfirming: isRemoveConfirm } = useRemoveLiquidity();

  const reserveUsdc = pool?.[0]?.result as bigint | undefined;
  const reserveEurc = pool?.[1]?.result as bigint | undefined;
  const totalShares = pool?.[2]?.result as bigint | undefined;

  const usdcBalance = balances?.[0]?.result as bigint | undefined;
  const eurcBalance = balances?.[1]?.result as bigint | undefined;
  const usdcAllowance = balances?.[2]?.result as bigint | undefined;
  const eurcAllowance = balances?.[3]?.result as bigint | undefined;

  const poolEmpty = !reserveUsdc || reserveUsdc === 0n;

  const parsedUsdc = parseUsdc(usdcAmount);
  const parsedEurc = parseUsdc(eurcAmount);

  function handleUsdcChange(v: string) {
    setUsdcAmount(v);
    if (!poolEmpty && reserveUsdc && reserveEurc && v) {
      const usdcVal = parseFloat(v);
      if (!isNaN(usdcVal)) {
        const eurcEquiv = (usdcVal * Number(reserveEurc)) / Number(reserveUsdc);
        setEurcAmount(eurcEquiv.toFixed(6));
      }
    }
  }

  function handleEurcChange(v: string) {
    setEurcAmount(v);
    if (!poolEmpty && reserveUsdc && reserveEurc && v) {
      const eurcVal = parseFloat(v);
      if (!isNaN(eurcVal)) {
        const usdcEquiv = (eurcVal * Number(reserveUsdc)) / Number(reserveEurc);
        setUsdcAmount(usdcEquiv.toFixed(6));
      }
    }
  }

  const needsUsdcApproval = parsedUsdc > 0n && (usdcAllowance ?? 0n) < parsedUsdc;
  const needsEurcApproval = parsedEurc > 0n && (eurcAllowance ?? 0n) < parsedEurc;

  async function handleAdd() {
    setError(null);
    setStatus(null);
    try {
      if (needsUsdcApproval) {
        setStatus("Approving USDC...");
        await approveUsdc.approve(parsedUsdc * 2n);
      }
      if (needsEurcApproval) {
        setStatus("Approving EURC...");
        await approveEurc.approve(parsedEurc * 2n);
      }
      setStatus("Adding liquidity...");
      await addLiquidity(parsedUsdc, parsedEurc);
      setStatus("Liquidity added.");
      setUsdcAmount("");
      setEurcAmount("");
      refetchBal();
      refetchPool();
      refetchShares();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 120) : "Transaction failed");
      setStatus(null);
    }
  }

  async function handleRemove() {
    setError(null);
    setStatus(null);
    try {
      const shares = parseUsdc(removeShares);
      setStatus("Removing liquidity...");
      await removeLiquidity(shares);
      setStatus("Liquidity removed.");
      setRemoveShares("");
      refetchBal();
      refetchPool();
      refetchShares();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 120) : "Transaction failed");
      setStatus(null);
    }
  }

  const userSharePct =
    userShares && totalShares && totalShares > 0n
      ? ((Number(userShares) / Number(totalShares)) * 100).toFixed(2)
      : "0.00";

  const userUsdcValue =
    userShares && reserveUsdc && totalShares && totalShares > 0n
      ? (userShares * reserveUsdc) / totalShares
      : 0n;

  const userEurcValue =
    userShares && reserveEurc && totalShares && totalShares > 0n
      ? (userShares * reserveEurc) / totalShares
      : 0n;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-4">
          {/* Your position */}
          {isConnected && userShares !== undefined && userShares > 0n && (
            <div className="bg-arc-card border border-arc-border rounded-2xl p-5 animate-slide-up">
              <h3 className="text-sm text-arc-muted mb-3">Your position</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-arc-muted mb-1">USDC value</p>
                  <p className="text-white font-semibold">${formatUsdc(userUsdcValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-arc-muted mb-1">EURC value</p>
                  <p className="text-white font-semibold">€{formatUsdc(userEurcValue)}</p>
                </div>
                <div>
                  <p className="text-xs text-arc-muted mb-1">Pool share</p>
                  <p className="text-white font-semibold">{userSharePct}%</p>
                </div>
              </div>
            </div>
          )}

          {/* Main card */}
          <div className="bg-arc-card border border-arc-border rounded-2xl p-6">
            {/* Tabs */}
            <div className="flex gap-1 bg-arc-dark rounded-xl p-1 mb-6">
              {(["add", "remove"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setStatus(null); setError(null); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    tab === t
                      ? "bg-arc-card text-white"
                      : "text-arc-muted hover:text-white"
                  }`}
                >
                  {t === "add" ? "Add liquidity" : "Remove liquidity"}
                </button>
              ))}
            </div>

            {tab === "add" ? (
              <div className="space-y-3">
                {poolEmpty && (
                  <div className="bg-arc-blue/10 border border-arc-blue/30 rounded-xl px-4 py-3 text-sm text-arc-blue">
                    You are the first liquidity provider. The amounts you deposit
                    set the initial price.
                  </div>
                )}

                <AmountInput
                  label="USDC"
                  value={usdcAmount}
                  onChange={handleUsdcChange}
                  balance={usdcBalance}
                  onMax={() => setUsdcAmount(usdcBalance ? (Number(usdcBalance) / 1e6).toString() : "0")}
                />
                <div className="flex justify-center">
                  <span className="text-arc-muted text-xl">+</span>
                </div>
                <AmountInput
                  label="EURC"
                  value={eurcAmount}
                  onChange={handleEurcChange}
                  balance={eurcBalance}
                  onMax={() => setEurcAmount(eurcBalance ? (Number(eurcBalance) / 1e6).toString() : "0")}
                />

                {parsedUsdc > 0n && parsedEurc > 0n && (
                  <div className="rounded-xl border border-arc-border p-3 text-xs text-arc-muted space-y-1">
                    {poolEmpty ? (
                      <p>Initial price: 1 USDC = {(Number(parsedEurc) / Number(parsedUsdc)).toFixed(6)} EURC</p>
                    ) : (
                      <p>Pool ratio followed. Both tokens deposited proportionally.</p>
                    )}
                    <p>LP tokens represent your proportional share of all fees earned.</p>
                  </div>
                )}

                {!isConnected ? (
                  <button disabled className="w-full py-3.5 rounded-xl bg-arc-blue/30 text-white/50 font-semibold cursor-not-allowed">
                    Connect wallet
                  </button>
                ) : needsUsdcApproval || needsEurcApproval ? (
                  <button
                    onClick={handleAdd}
                    disabled={isAdding || isAddConfirm}
                    className="w-full py-3.5 rounded-xl bg-shell-amber text-white font-semibold hover:bg-shell-gold transition-colors disabled:opacity-60"
                  >
                    Approve and add
                  </button>
                ) : (
                  <button
                    onClick={handleAdd}
                    disabled={!CARAPACE_ADDRESS || parsedUsdc === 0n || parsedEurc === 0n || isAdding || isAddConfirm}
                    className="w-full py-3.5 rounded-xl bg-arc-blue text-white font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
                  >
                    {isAdding || isAddConfirm ? "Adding..." : "Add liquidity"}
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-arc-muted mb-2">
                    <span>LP tokens to burn</span>
                    {userShares !== undefined && (
                      <button
                        onClick={() => setRemoveShares((Number(userShares) / 1e6).toString())}
                        className="text-arc-blue hover:underline"
                      >
                        Max {formatUsdc(userShares)}
                      </button>
                    )}
                  </div>
                  <div className="bg-arc-dark rounded-xl p-4">
                    <input
                      type="number"
                      value={removeShares}
                      onChange={(e) => setRemoveShares(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-transparent text-2xl font-semibold text-white placeholder-arc-muted/40 outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={handleRemove}
                  disabled={!isConnected || !CARAPACE_ADDRESS || !removeShares || isRemoving || isRemoveConfirm}
                  className="w-full py-3.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-semibold hover:bg-red-500/30 transition-colors disabled:opacity-60"
                >
                  {isRemoving || isRemoveConfirm ? "Removing..." : "Remove liquidity"}
                </button>
              </div>
            )}

            {status && <p className="mt-3 text-sm text-green-400 text-center">{status}</p>}
            {error && <p className="mt-3 text-xs text-red-400 text-center break-all">{error}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <PoolStats />
          <div className="bg-arc-card border border-arc-border rounded-2xl p-5 text-sm">
            <p className="text-white font-medium mb-2">Earning as an LP</p>
            <ul className="space-y-2 text-arc-muted text-xs">
              <li className="flex gap-2">
                <span className="text-green-400">✓</span>
                <span>0.30% fee on every swap, proportional to your share</span>
              </li>
              <li className="flex gap-2">
                <span className="text-green-400">✓</span>
                <span>
                  Fees accumulate in the reserves, so your position grows
                  without any action on your part
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-shell-amber">↗</span>
                <span>
                  20% of fee revenue seeds the arb pool, which attracts
                  arbitrageurs who maintain a fair price for you
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function AmountInput({
  label,
  value,
  onChange,
  balance,
  onMax,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  balance: bigint | undefined;
  onMax: () => void;
}) {
  return (
    <div className="bg-arc-dark rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-semibold ${label === "USDC" ? "text-usdc" : "text-eurc"}`}>
          {label}
        </span>
        {balance !== undefined && (
          <button onClick={onMax} className="text-xs text-arc-blue hover:underline">
            Max {formatUsdc(balance)}
          </button>
        )}
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="w-full bg-transparent text-2xl font-semibold text-white placeholder-arc-muted/40 outline-none"
      />
    </div>
  );
}
