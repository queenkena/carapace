// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {CarapaceDEX} from "../src/CarapaceDEX.sol";

contract DeployScript is Script {
    address constant USDC_ARC = 0x3600000000000000000000000000000000000000;
    address constant EURC_ARC = 0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a;

    function run() public returns (CarapaceDEX dex) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer:", deployer);
        console.log("USDC:", USDC_ARC);
        console.log("EURC:", EURC_ARC);

        vm.startBroadcast(deployerKey);
        dex = new CarapaceDEX(USDC_ARC, EURC_ARC);
        vm.stopBroadcast();

        console.log("CarapaceDEX deployed at:", address(dex));
        console.log("Batch duration:", dex.BATCH_DURATION(), "seconds");
        console.log("");
        console.log("Next: add NEXT_PUBLIC_CARAPACE_ADDRESS to .env");
    }
}
