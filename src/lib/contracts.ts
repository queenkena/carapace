export const CARAPACE_ADDRESS = (
  process.env.NEXT_PUBLIC_CARAPACE_ADDRESS ?? ""
) as `0x${string}`;

export const USDC_ADDRESS =
  "0x3600000000000000000000000000000000000000" as const;

export const EURC_ADDRESS =
  "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

export const CARAPACE_ABI = [
  // Pool state
  {
    type: "function",
    name: "reserveUsdc",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reserveEurc",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalShares",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "shares",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "spotPrice",
    inputs: [],
    outputs: [{ name: "eurcPerUsdc", type: "uint256" }],
    stateMutability: "view",
  },
  // Batch state
  {
    type: "function",
    name: "batchId",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "batchOpenedAt",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "BATCH_DURATION",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "batchTimeRemaining",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingOrderCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "batches",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "settledAt", type: "uint256" },
      { name: "orderCount", type: "uint256" },
      { name: "filledCount", type: "uint256" },
      { name: "usdcVolume", type: "uint256" },
      { name: "eurcVolume", type: "uint256" },
      { name: "clearingPrice", type: "uint256" },
      { name: "settled", type: "bool" },
    ],
    stateMutability: "view",
  },
  // Arb pool
  {
    type: "function",
    name: "arbPool",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "arbClaimCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "arbClaims",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "arber", type: "address" },
      { name: "batchId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "claimedAt", type: "uint256" },
    ],
    stateMutability: "view",
  },
  // Actions
  {
    type: "function",
    name: "addLiquidity",
    inputs: [
      { name: "usdcAmount", type: "uint256" },
      { name: "eurcAmount", type: "uint256" },
    ],
    outputs: [{ name: "issued", type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "removeLiquidity",
    inputs: [{ name: "shareAmount", type: "uint256" }],
    outputs: [
      { name: "usdcOut", type: "uint256" },
      { name: "eurcOut", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "submitOrder",
    inputs: [
      { name: "buyEurc", type: "bool" },
      { name: "amountIn", type: "uint256" },
      { name: "minOut", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "settleBatch",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "claimArbReward",
    inputs: [{ name: "claimBatchId", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // Events
  {
    type: "event",
    name: "OrderSubmitted",
    inputs: [
      { name: "batchId", type: "uint256", indexed: true },
      { name: "trader", type: "address", indexed: true },
      { name: "buyEurc", type: "bool", indexed: false },
      { name: "amountIn", type: "uint256", indexed: false },
      { name: "minOut", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BatchSettled",
    inputs: [
      { name: "batchId", type: "uint256", indexed: true },
      { name: "orderCount", type: "uint256", indexed: false },
      { name: "filledCount", type: "uint256", indexed: false },
      { name: "clearingPrice", type: "uint256", indexed: false },
      { name: "usdcVolume", type: "uint256", indexed: false },
      { name: "eurcVolume", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ArbClaimed",
    inputs: [
      { name: "arber", type: "address", indexed: true },
      { name: "batchId", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
