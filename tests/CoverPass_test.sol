// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import "remix_tests.sol"; // Import Remix's test library
import "../contracts/CoverPass.sol"; // Import the contract to be tested

contract TestCoverPass {
    CoverPass coverPass;
    bytes32 bob;
    bytes32 alice;
    bytes32 david;
    bytes32 eve;
    bytes32 ba;
    bytes32 de;
    bytes32 bade;

    function beforeAll() public {
        coverPass = new CoverPass(msg.sender);
        bob = keccak256(abi.encodePacked("bob"));
        alice = keccak256(abi.encodePacked("alice"));
        david = keccak256(abi.encodePacked("david"));
        eve = keccak256(abi.encodePacked("eve"));
        ba = keccak256(abi.encodePacked(bob, alice));
        de = keccak256(abi.encodePacked(david, eve));
        bade = keccak256(abi.encodePacked(ba, de));
        coverPass.addMerkelRoot(ba);
        coverPass.grantRole(coverPass.INSURER_ROLE(), msg.sender);
    }

    function checkMerkelProofBob() public {
        bytes32[] memory _proof = new bytes32[](1);
        _proof[0] = alice;
        //_proof[1] = de;
        Assert.equal(coverPass.verifyCoverage(_proof, ba, bob), true, "Bob should have coverage");
    }
}