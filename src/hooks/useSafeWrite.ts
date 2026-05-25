"use client";

import { useAccount, useSwitchChain, useWriteContract } from "wagmi";
import { arcTestnet } from "@/lib/chains";

/**
 * Drop-in replacement for useWriteContract.
 * Reads the chain from useAccount().chain — the authoritative wallet
 * value — and awaits a switch to Arc Testnet before every single
 * writeContractAsync call. No transaction reaches the wallet while
 * on the wrong network.
 */
export function useSafeWrite() {
  const { chain } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync: _write, ...rest } = useWriteContract();

  const writeContractAsync: typeof _write = async (...args) => {
    if (chain?.id !== arcTestnet.id) {
      await switchChainAsync({ chainId: arcTestnet.id });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (_write as any)(...args);
  };

  return { writeContractAsync, ...rest };
}
