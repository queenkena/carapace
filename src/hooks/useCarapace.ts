"use client";

import {
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useAccount,
} from "wagmi";
import { useSafeWrite } from "./useSafeWrite";
import {
  CARAPACE_ADDRESS,
  CARAPACE_ABI,
  USDC_ADDRESS,
  EURC_ADDRESS,
  ERC20_ABI,
} from "@/lib/contracts";

const dex = { address: CARAPACE_ADDRESS, abi: CARAPACE_ABI } as const;

export function usePoolState() {
  return useReadContracts({
    contracts: [
      { ...dex, functionName: "reserveUsdc" },
      { ...dex, functionName: "reserveEurc" },
      { ...dex, functionName: "totalShares" },
      { ...dex, functionName: "spotPrice" },
      { ...dex, functionName: "batchId" },
      { ...dex, functionName: "batchOpenedAt" },
      { ...dex, functionName: "BATCH_DURATION" },
      { ...dex, functionName: "pendingOrderCount" },
      { ...dex, functionName: "arbPool" },
      { ...dex, functionName: "arbClaimCount" },
    ],
    query: {
      enabled: !!CARAPACE_ADDRESS,
      refetchInterval: 3000,
    },
  });
}

export function useBatchTimeRemaining() {
  return useReadContract({
    ...dex,
    functionName: "batchTimeRemaining",
    query: {
      enabled: !!CARAPACE_ADDRESS,
      refetchInterval: 1000,
    },
  });
}

export function useBatch(id: bigint | undefined) {
  return useReadContract({
    ...dex,
    functionName: "batches",
    args: id !== undefined ? [id] : undefined,
    query: {
      enabled: id !== undefined && !!CARAPACE_ADDRESS,
      refetchInterval: 5000,
    },
  });
}

export function useUserShares(address: `0x${string}` | undefined) {
  return useReadContract({
    ...dex,
    functionName: "shares",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!CARAPACE_ADDRESS,
      refetchInterval: 5000,
    },
  });
}

export function useTokenBalances(address: `0x${string}` | undefined) {
  return useReadContracts({
    contracts: [
      {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
      {
        address: EURC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: address ? [address] : undefined,
      },
      {
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, CARAPACE_ADDRESS] : undefined,
      },
      {
        address: EURC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: address ? [address, CARAPACE_ADDRESS] : undefined,
      },
    ],
    query: {
      enabled: !!address && !!CARAPACE_ADDRESS,
      refetchInterval: 3000,
    },
  });
}

export function useApprove(token: "usdc" | "eurc") {
  const { writeContractAsync, data: hash, isPending, error } = useSafeWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    approve: (amount: bigint) =>
      writeContractAsync({
        address: token === "usdc" ? USDC_ADDRESS : EURC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CARAPACE_ADDRESS, amount],
      }),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useSubmitOrder() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useSafeWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    submitOrder: (buyEurc: boolean, amountIn: bigint, minOut: bigint) =>
      writeContractAsync({
        ...dex,
        functionName: "submitOrder",
        args: [buyEurc, amountIn, minOut],
      }),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useSettleBatch() {
  const { writeContractAsync, data: hash, isPending, error } = useSafeWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    settle: () =>
      writeContractAsync({
        ...dex,
        functionName: "settleBatch",
      }),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

export function useAddLiquidity() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useSafeWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    addLiquidity: (usdcAmount: bigint, eurcAmount: bigint) =>
      writeContractAsync({
        ...dex,
        functionName: "addLiquidity",
        args: [usdcAmount, eurcAmount],
      }),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useRemoveLiquidity() {
  const { writeContractAsync, data: hash, isPending, error, reset } = useSafeWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    removeLiquidity: (shareAmount: bigint) =>
      writeContractAsync({
        ...dex,
        functionName: "removeLiquidity",
        args: [shareAmount],
      }),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}

export function useClaimArbReward() {
  const { writeContractAsync, data: hash, isPending, error } = useSafeWrite();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  return {
    claim: (batchId: bigint) =>
      writeContractAsync({
        ...dex,
        functionName: "claimArbReward",
        args: [batchId],
      }),
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}
