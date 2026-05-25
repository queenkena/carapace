"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { arcTestnet } from "@/lib/chains";
import { Logo } from "./Logo";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, chain } = useAccount();
  const { switchChain, isPending, error } = useSwitchChain();

  const wrongNetwork = isConnected && chain?.id !== arcTestnet.id;

  if (wrongNetwork) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
        <div className="bg-arc-card border border-arc-border rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="flex justify-center mb-6">
            <Logo size={48} />
          </div>

          <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 6v4M9 12.5h.01M17 9A8 8 0 1 1 1 9a8 8 0 0 1 16 0Z"
                stroke="#F87171"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-white mb-2">Wrong network</h2>
          <p className="text-sm text-arc-muted leading-relaxed mb-1">
            Carapace runs on Arc Testnet. Your wallet is connected to{" "}
            <span className="text-white">{chain?.name ?? "an unknown network"}</span>.
          </p>
          <p className="text-xs text-arc-muted mb-6">
            Required chain ID:{" "}
            <span className="text-white font-mono">{arcTestnet.id}</span>
          </p>

          <button
            onClick={() => switchChain({ chainId: arcTestnet.id })}
            disabled={isPending}
            className="w-full py-3 rounded-xl bg-arc-blue text-white font-semibold hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {isPending ? "Switching..." : "Switch to Arc Testnet"}
          </button>

          {error && (
            <p className="mt-3 text-xs text-red-400">
              {error.message.includes("4902") || error.message.includes("Unrecognized")
                ? "Arc Testnet is not in your wallet yet. Click switch again to add it."
                : error.message.slice(0, 100)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
