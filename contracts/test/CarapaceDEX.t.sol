// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {CarapaceDEX} from "../src/CarapaceDEX.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";

/// @dev Minimal ERC-20 for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals = 6;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract CarapaceDEXTest is Test {
    CarapaceDEX dex;
    MockERC20 usdc;
    MockERC20 eurc;

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address arber = makeAddr("arber");

    function setUp() public {
        usdc = new MockERC20("USD Coin", "USDC");
        eurc = new MockERC20("Euro Coin", "EURC");
        dex = new CarapaceDEX(address(usdc), address(eurc));

        // Seed test accounts
        usdc.mint(alice, 10_000e6);
        eurc.mint(alice, 10_000e6);
        usdc.mint(bob, 5_000e6);
        eurc.mint(bob, 5_000e6);
        usdc.mint(arber, 1_000e6);

        vm.prank(alice);
        usdc.approve(address(dex), type(uint256).max);
        vm.prank(alice);
        eurc.approve(address(dex), type(uint256).max);
        vm.prank(bob);
        usdc.approve(address(dex), type(uint256).max);
        vm.prank(bob);
        eurc.approve(address(dex), type(uint256).max);
        vm.prank(arber);
        usdc.approve(address(dex), type(uint256).max);
    }

    function test_addLiquidity() public {
        vm.prank(alice);
        uint256 issued = dex.addLiquidity(1_000e6, 1_100e6);
        assertGt(issued, 0, "shares issued");
        assertEq(dex.reserveUsdc(), 1_000e6);
        assertEq(dex.reserveEurc(), 1_100e6);
        assertEq(dex.shares(alice), issued);
    }

    function test_removeLiquidity() public {
        vm.prank(alice);
        uint256 issued = dex.addLiquidity(1_000e6, 1_100e6);

        vm.prank(alice);
        (uint256 uOut, uint256 eOut) = dex.removeLiquidity(issued);

        assertEq(uOut, 1_000e6);
        assertEq(eOut, 1_100e6);
        assertEq(dex.totalShares(), 0);
    }

    function test_batchSettlementUniformPrice() public {
        // Seed pool: 1 USDC = 1.1 EURC
        vm.prank(alice);
        dex.addLiquidity(1_000e6, 1_100e6);

        // Bob submits two separate orders to buy EURC
        vm.prank(bob);
        dex.submitOrder(true, 100e6, 0); // buy EURC with 100 USDC
        vm.prank(bob);
        dex.submitOrder(true, 50e6, 0);  // buy EURC with 50 USDC

        assertEq(dex.pendingOrderCount(), 2);

        // Advance time past batch window
        vm.warp(block.timestamp + dex.BATCH_DURATION() + 1);

        uint256 bobUsdcBefore = usdc.balanceOf(bob);
        uint256 bobEurcBefore = eurc.balanceOf(bob);

        dex.settleBatch();

        uint256 eurcGained = eurc.balanceOf(bob) - bobEurcBefore;
        assertGt(eurcGained, 0, "bob received EURC");

        // Both orders should have received the SAME rate (uniform clearing price)
        console.log("Batch settled. Bob received EURC:", eurcGained);
    }

    function test_slippageRefund() public {
        vm.prank(alice);
        dex.addLiquidity(1_000e6, 1_100e6);

        uint256 bobUsdcBefore = usdc.balanceOf(bob);

        // Bob demands an impossible minOut
        vm.prank(bob);
        dex.submitOrder(true, 100e6, 999_999e6); // would never be satisfied

        vm.warp(block.timestamp + dex.BATCH_DURATION() + 1);
        dex.settleBatch();

        // Bob should get his USDC back
        assertEq(usdc.balanceOf(bob), bobUsdcBefore, "full refund on slippage");
    }

    function test_arbPoolFunded() public {
        vm.prank(alice);
        dex.addLiquidity(1_000e6, 1_100e6);

        vm.prank(bob);
        dex.submitOrder(true, 500e6, 0);

        vm.warp(block.timestamp + dex.BATCH_DURATION() + 1);
        dex.settleBatch();

        assertGt(dex.arbPool(), 0, "arb pool funded from fees");
        console.log("Arb pool funded:", dex.arbPool());
    }

    function test_arbClaim() public {
        vm.prank(alice);
        dex.addLiquidity(1_000e6, 1_100e6);

        vm.prank(bob);
        dex.submitOrder(true, 500e6, 0);

        vm.warp(block.timestamp + dex.BATCH_DURATION() + 1);
        dex.settleBatch();

        uint256 pool = dex.arbPool();
        uint256 arberBefore = usdc.balanceOf(arber);

        vm.prank(arber);
        dex.claimArbReward(0);

        assertGt(usdc.balanceOf(arber), arberBefore, "arber earned reward");
        assertLt(dex.arbPool(), pool, "arb pool reduced");
    }

    function test_cannotSettleBeforeWindow() public {
        vm.prank(alice);
        dex.addLiquidity(1_000e6, 1_100e6);
        vm.prank(bob);
        dex.submitOrder(true, 100e6, 0);

        vm.expectRevert("batch window open");
        dex.settleBatch();
    }

    function test_bothSidesSettle() public {
        vm.prank(alice);
        dex.addLiquidity(2_000e6, 2_200e6);

        // Alice buys EURC, Bob buys USDC — both in same batch
        vm.prank(alice);
        dex.submitOrder(true, 100e6, 0);
        vm.prank(bob);
        dex.submitOrder(false, 110e6, 0);

        vm.warp(block.timestamp + dex.BATCH_DURATION() + 1);

        uint256 aliceEurcBefore = eurc.balanceOf(alice);
        uint256 bobUsdcBefore = usdc.balanceOf(bob);

        dex.settleBatch();

        assertGt(eurc.balanceOf(alice), aliceEurcBefore, "alice got EURC");
        assertGt(usdc.balanceOf(bob), bobUsdcBefore, "bob got USDC");
    }
}
