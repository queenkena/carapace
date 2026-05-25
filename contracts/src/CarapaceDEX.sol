// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "./interfaces/IERC20.sol";

/// @notice Batch auction DEX. All swaps within a window settle at a single
///         uniform clearing price, making sandwich attacks structurally
///         impossible. Beneficial back-running is explicitly rewarded.
contract CarapaceDEX {
    // ── Tokens ───────────────────────────────────────────────────────────────

    IERC20 public immutable usdc;
    IERC20 public immutable eurc;

    // ── Pool state ───────────────────────────────────────────────────────────

    uint256 public reserveUsdc;
    uint256 public reserveEurc;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    // ── Batch state ──────────────────────────────────────────────────────────

    uint256 public constant FEE_BPS = 30;         // 0.30% swap fee
    uint256 public constant ARB_SHARE_BPS = 2000; // 20% of fees to arb pool
    uint256 public constant BATCH_DURATION = 30;  // seconds per batch window

    uint256 public batchId;
    uint256 public batchOpenedAt;

    struct Order {
        address trader;
        bool buyEurc;   // true = USDC→EURC, false = EURC→USDC
        uint256 amountIn;
        uint256 minOut;
    }

    Order[] internal _pending;

    struct BatchSummary {
        uint256 settledAt;
        uint256 orderCount;
        uint256 filledCount;
        uint256 usdcVolume;
        uint256 eurcVolume;
        uint256 clearingPrice; // EURC per USDC scaled by 1e6 (0 when no USDC orders)
        bool settled;
    }

    mapping(uint256 => BatchSummary) public batches;

    // ── Arb pool ─────────────────────────────────────────────────────────────

    uint256 public arbPool; // USDC-denominated

    struct ArbClaim {
        address arber;
        uint256 batchId;
        uint256 amount;
        uint256 claimedAt;
    }

    ArbClaim[] public arbClaims;

    // ── Reentrancy guard ─────────────────────────────────────────────────────

    uint256 private _status = 1;

    modifier nonReentrant() {
        require(_status == 1, "reentrant");
        _status = 2;
        _;
        _status = 1;
    }

    // ── Events ───────────────────────────────────────────────────────────────

    event OrderSubmitted(
        uint256 indexed batchId,
        address indexed trader,
        bool buyEurc,
        uint256 amountIn,
        uint256 minOut
    );

    event BatchSettled(
        uint256 indexed batchId,
        uint256 orderCount,
        uint256 filledCount,
        uint256 clearingPrice,
        uint256 usdcVolume,
        uint256 eurcVolume
    );

    event LiquidityAdded(
        address indexed provider,
        uint256 usdcAmount,
        uint256 eurcAmount,
        uint256 sharesIssued
    );

    event LiquidityRemoved(
        address indexed provider,
        uint256 usdcAmount,
        uint256 eurcAmount,
        uint256 sharesBurned
    );

    event ArbClaimed(address indexed arber, uint256 batchId, uint256 amount);

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdc, address _eurc) {
        usdc = IERC20(_usdc);
        eurc = IERC20(_eurc);
        batchOpenedAt = block.timestamp;
    }

    // ── Liquidity ────────────────────────────────────────────────────────────

    /// @notice Seed or add to the pool. First LP sets the price; subsequent
    ///         LPs must match the current ratio (within 1%).
    function addLiquidity(uint256 usdcAmount, uint256 eurcAmount) external nonReentrant returns (uint256 issued) {
        require(usdcAmount > 0 && eurcAmount > 0, "zero amount");

        if (totalShares == 0) {
            issued = sqrt(usdcAmount * eurcAmount);
            reserveUsdc = usdcAmount;
            reserveEurc = eurcAmount;
        } else {
            uint256 usdcRatio = usdcAmount * 1e18 / reserveUsdc;
            uint256 eurcRatio = eurcAmount * 1e18 / reserveEurc;
            require(
                diff(usdcRatio, eurcRatio) * 100 / max(usdcRatio, eurcRatio) <= 1,
                "ratio off by more than 1%"
            );
            issued = totalShares * usdcAmount / reserveUsdc;
            reserveUsdc += usdcAmount;
            reserveEurc += eurcAmount;
        }

        totalShares += issued;
        shares[msg.sender] += issued;

        usdc.transferFrom(msg.sender, address(this), usdcAmount);
        eurc.transferFrom(msg.sender, address(this), eurcAmount);

        emit LiquidityAdded(msg.sender, usdcAmount, eurcAmount, issued);
    }

    function removeLiquidity(uint256 shareAmount) external nonReentrant returns (uint256 usdcOut, uint256 eurcOut) {
        require(shareAmount > 0 && shares[msg.sender] >= shareAmount, "insufficient shares");

        usdcOut = reserveUsdc * shareAmount / totalShares;
        eurcOut = reserveEurc * shareAmount / totalShares;

        shares[msg.sender] -= shareAmount;
        totalShares -= shareAmount;
        reserveUsdc -= usdcOut;
        reserveEurc -= eurcOut;

        usdc.transfer(msg.sender, usdcOut);
        eurc.transfer(msg.sender, eurcOut);

        emit LiquidityRemoved(msg.sender, usdcOut, eurcOut, shareAmount);
    }

    // ── Order submission ─────────────────────────────────────────────────────

    /// @notice Queue a swap into the current batch. Tokens are held by the
    ///         contract until the batch settles.
    function submitOrder(bool buyEurc, uint256 amountIn, uint256 minOut) external nonReentrant {
        require(amountIn > 0, "zero amount");
        require(reserveUsdc > 0 && reserveEurc > 0, "pool empty");

        if (buyEurc) {
            usdc.transferFrom(msg.sender, address(this), amountIn);
        } else {
            eurc.transferFrom(msg.sender, address(this), amountIn);
        }

        _pending.push(Order({
            trader: msg.sender,
            buyEurc: buyEurc,
            amountIn: amountIn,
            minOut: minOut
        }));

        emit OrderSubmitted(batchId, msg.sender, buyEurc, amountIn, minOut);
    }

    // ── Batch settlement ─────────────────────────────────────────────────────

    /// @notice Settle the current batch. Anyone can call this once the window
    ///         has elapsed. All filled orders receive the same clearing price.
    function settleBatch() external nonReentrant {
        require(block.timestamp >= batchOpenedAt + BATCH_DURATION, "batch window open");
        require(_pending.length > 0, "nothing to settle");

        uint256 n = _pending.length;
        bool[] memory filled = new bool[](n);

        // Pass 1: determine which orders clear at spot price
        uint256 totalUsdcIn = 0;
        uint256 totalEurcIn = 0;
        uint256 filledCount = 0;

        for (uint256 i = 0; i < n; i++) {
            Order memory o = _pending[i];
            uint256 wouldGet;

            if (o.buyEurc) {
                // USDC → EURC at spot (pre-fee)
                uint256 amtFee = o.amountIn * (10000 - FEE_BPS) / 10000;
                wouldGet = amtFee * reserveEurc / reserveUsdc;
            } else {
                // EURC → USDC at spot (pre-fee)
                uint256 amtFee = o.amountIn * (10000 - FEE_BPS) / 10000;
                wouldGet = amtFee * reserveUsdc / reserveEurc;
            }

            if (wouldGet >= o.minOut) {
                filled[i] = true;
                if (o.buyEurc) totalUsdcIn += o.amountIn;
                else totalEurcIn += o.amountIn;
                filledCount++;
            }
        }

        // Pass 2: compute aggregate AMM output for each side
        uint256 eurcFromPool = 0;
        uint256 usdcFromPool = 0;

        if (totalUsdcIn > 0) {
            uint256 usdcInFee = totalUsdcIn * (10000 - FEE_BPS) / 10000;
            eurcFromPool = reserveEurc * usdcInFee / (reserveUsdc + usdcInFee);
        }
        if (totalEurcIn > 0) {
            uint256 eurcInFee = totalEurcIn * (10000 - FEE_BPS) / 10000;
            usdcFromPool = reserveUsdc * eurcInFee / (reserveEurc + eurcInFee);
        }

        // Pass 3: distribute to traders
        for (uint256 i = 0; i < n; i++) {
            Order memory o = _pending[i];
            if (filled[i]) {
                uint256 payout;
                if (o.buyEurc) {
                    payout = eurcFromPool * o.amountIn / totalUsdcIn;
                    eurc.transfer(o.trader, payout);
                } else {
                    payout = usdcFromPool * o.amountIn / totalEurcIn;
                    usdc.transfer(o.trader, payout);
                }
            } else {
                // Refund — slippage exceeded
                if (o.buyEurc) {
                    usdc.transfer(o.trader, o.amountIn);
                } else {
                    eurc.transfer(o.trader, o.amountIn);
                }
            }
        }

        // Update reserves
        reserveUsdc = reserveUsdc + totalUsdcIn - usdcFromPool;
        reserveEurc = reserveEurc + totalEurcIn - eurcFromPool;

        // Fund arb pool from swap fee revenue (20% of USDC fees)
        uint256 usdcFeeCollected = totalUsdcIn * FEE_BPS / 10000;
        arbPool += usdcFeeCollected * ARB_SHARE_BPS / 10000;

        // Clearing price: EURC per USDC scaled by 1e6
        uint256 clearingPrice = totalUsdcIn > 0 ? eurcFromPool * 1e6 / totalUsdcIn : 0;

        batches[batchId] = BatchSummary({
            settledAt: block.timestamp,
            orderCount: n,
            filledCount: filledCount,
            usdcVolume: totalUsdcIn,
            eurcVolume: totalEurcIn,
            clearingPrice: clearingPrice,
            settled: true
        });

        emit BatchSettled(batchId, n, filledCount, clearingPrice, totalUsdcIn, totalEurcIn);

        // Open next batch
        batchId++;
        batchOpenedAt = block.timestamp;

        // Clear pending orders
        uint256 toDel = _pending.length;
        for (uint256 i = 0; i < toDel; i++) {
            _pending.pop();
        }
    }

    // ── Arb rewards ──────────────────────────────────────────────────────────

    /// @notice Back-runners call this to claim a portion of the arb pool.
    ///         On mainnet this would require proof of cross-venue arbitrage.
    ///         On testnet we reward anyone who calls it, simulating the
    ///         "constructive MEV" incentive.
    function claimArbReward(uint256 claimBatchId) external nonReentrant {
        require(batches[claimBatchId].settled, "batch not settled");
        require(arbPool > 0, "pool empty");

        // Award 1% of the pool per claim (capped so pool drains gracefully)
        uint256 award = arbPool / 100;
        if (award == 0) award = arbPool;

        arbPool -= award;
        usdc.transfer(msg.sender, award);

        arbClaims.push(ArbClaim({
            arber: msg.sender,
            batchId: claimBatchId,
            amount: award,
            claimedAt: block.timestamp
        }));

        emit ArbClaimed(msg.sender, claimBatchId, award);
    }

    // ── Views ────────────────────────────────────────────────────────────────

    function pendingOrderCount() external view returns (uint256) {
        return _pending.length;
    }

    function getPendingOrder(uint256 idx) external view returns (Order memory) {
        return _pending[idx];
    }

    function arbClaimCount() external view returns (uint256) {
        return arbClaims.length;
    }

    function spotPrice() external view returns (uint256 eurcPerUsdc) {
        if (reserveUsdc == 0) return 0;
        return reserveEurc * 1e6 / reserveUsdc;
    }

    function batchTimeRemaining() external view returns (uint256) {
        uint256 end = batchOpenedAt + BATCH_DURATION;
        if (block.timestamp >= end) return 0;
        return end - block.timestamp;
    }

    // ── Math helpers ─────────────────────────────────────────────────────────

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    function diff(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a - b : b - a;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }
}
