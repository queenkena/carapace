# Carapace

Carapace is a decentralised exchange built on Arc Testnet where sandwich attacks are structurally impossible. Instead of processing swaps one at a time in the order they land in a block, Carapace collects every swap submitted within a 30-second window and settles them all at a single uniform clearing price. Because every order in a batch pays the same price, there is no way to front-run or sandwich anyone.

---

## How it works

### Batch auctions

A new batch opens automatically after each settlement. Any swap submitted before the 30-second window closes joins that batch. When the timer hits zero, anyone can call `settleBatch`. The contract then:

1. Aggregates all buy-side and sell-side volume.
2. Computes a single clearing price from the pool reserves and the total input of each side.
3. Distributes output tokens to every filled order at that identical price.
4. Refunds orders whose slippage tolerance would have been breached.

Because every participant receives the same price, a searcher has nothing to gain by sandwiching. The "insert a buy before and a sell after" strategy only works when the victim's transaction moves the price. Here it cannot.

### Constructive MEV

Carapace does not try to eliminate all MEV. It only blocks extractive MEV. After each batch, the on-chain price may diverge briefly from prices on other venues. The protocol sets aside 20% of every swap fee into an arb pool and pays that to arbitrageurs who call `claimArbReward`. Restoring the price benefits every LP, so back-running is explicitly welcomed rather than fought.

### Arc Testnet

Arc's ~350ms block time is what makes short batch windows practical. On Ethereum mainnet a 30-second batch would span roughly two blocks, which is too coarse. On Arc it spans tens of blocks, giving users time to react while keeping settlement frequent enough to feel responsive.

---

## Project structure

```
carapace/
├── contracts/             Foundry project
│   ├── src/
│   │   └── CarapaceDEX.sol    The core batch-auction DEX contract
│   ├── script/
│   │   └── Deploy.s.sol       Deployment script
│   └── test/
│       └── CarapaceDEX.t.sol  Forge test suite
└── src/                   Next.js frontend
    ├── app/
    │   ├── page.tsx           Landing page
    │   ├── swap/              Swap interface
    │   ├── liquidity/         LP deposit and withdrawal
    │   └── mev/               Live MEV feed showing arb claims
    ├── components/            Shared UI components
    ├── hooks/                 wagmi/viem contract hooks
    └── lib/                   Chain config, ABI, utilities
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 or later |
| Foundry | latest (`foundryup`) |
| A wallet | with Arc Testnet USDC |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/queenkena/carapace.git
cd carapace
npm install
```

### 2. Set up environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env
```

The variables you need:

```
PRIVATE_KEY=0x...                         # Deployer private key
ARC_RPC_URL=https://rpc.testnet.arc.network
NEXT_PUBLIC_CARAPACE_ADDRESS=0x...        # Filled in after deployment
```

### 3. Build and test the contracts

```bash
make build    # compile
make test     # run the Forge test suite
```

### 4. Deploy to Arc Testnet

```bash
make deploy
```

The script prints the deployed address. Copy it into your `.env` as `NEXT_PUBLIC_CARAPACE_ADDRESS`.

To do a dry run without broadcasting:

```bash
make deploy-dry
```

### 5. Run the frontend

```bash
make dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and connect a wallet configured for Arc Testnet.

---

## Token addresses on Arc Testnet

| Token | Address |
|-------|---------|
| USDC | `0x3600000000000000000000000000000000000000` |
| EURC | `0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a` |

Arc Testnet uses USDC as its native gas currency. You do not need a separate gas token.

---

## Contract overview

**`CarapaceDEX.sol`** is a single self-contained contract. There are no proxy patterns, no upgrades, no admin keys.

### Key parameters

| Parameter | Value | Notes |
|-----------|-------|-------|
| `BATCH_DURATION` | 30 seconds | Length of each swap window |
| `FEE_BPS` | 30 (0.30%) | Applied to each swap before clearing |
| `ARB_SHARE_BPS` | 2000 (20%) | Portion of USDC fees routed to the arb pool |

### Core functions

`addLiquidity(usdcAmount, eurcAmount)` — Deposit both tokens to receive LP shares. The first deposit sets the initial price. Subsequent deposits must match the current reserve ratio within 1%.

`removeLiquidity(shareAmount)` — Burn LP shares to withdraw a proportional share of both reserves.

`submitOrder(buyEurc, amountIn, minOut)` — Queue a swap into the current batch. Tokens transfer to the contract immediately and are held until settlement.

`settleBatch()` — Settle the open batch. Can be called by anyone once `BATCH_DURATION` has elapsed. Computes the clearing price, distributes fills, refunds rejected orders, and opens the next batch.

`claimArbReward(batchId)` — Claim a portion of the arb pool after a batch has settled. Awards 1% of the current pool balance per call, draining it gracefully over time.

---

## Adding Arc Testnet to your wallet

| Field | Value |
|-------|-------|
| Network name | Arc Testnet |
| RPC URL | https://rpc.testnet.arc.network |
| Chain ID | 5042002 |
| Currency symbol | USDC |
| Block explorer | https://testnet.arcscan.app |

---

## Useful make targets

```bash
make build       # compile contracts
make test        # run forge tests with verbose output
make fmt         # format Solidity with forge fmt
make clean       # remove build artifacts
make deploy      # broadcast deployment to Arc Testnet
make deploy-dry  # simulate deployment without broadcasting
make dev         # start the Next.js dev server
make balance     # check USDC balance of DEPLOYER_ADDRESS
make block       # print the current block number on Arc Testnet
```

---

## Arc Testnet links

- Explorer: https://testnet.arcscan.app
- RPC: https://rpc.testnet.arc.network
