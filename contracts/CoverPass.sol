// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
//import "@openzeppelin/contracts/utils/structs/MerkleTree.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

//using MerkleTree for MerkleTree.Bytes32PushTree;

/**
 * @title Storage
 * @dev Store & retrieve value in a variable
 * @custom:dev-run-script ./scripts/deploy_with_ethers.ts
 */
contract CoverPass is AccessControl {
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    mapping(address => bytes32) public merkelRoots;

    uint256 number;

    //bytes32 public merkleRoot;
    //MerkleTree.Bytes32PushTree private tree;

    constructor(address defaultAdmin) {
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);

        
        //merkleRoot = tree.setup(3, 0);
        

    }

    // Inserts the merkel root of the insurance company, if they are whitelisted
    function addMerkelRoot(bytes32 _root) public {
        _checkRole(INSURER_ROLE, msg.sender);
        merkelRoots[msg.sender] = _root;
    }


    function verifyCoverage(bytes32[] memory _proof, bytes32 _root, bytes32 _leaf) public view returns (bool) {
        _checkRole(VERIFIER_ROLE, msg.sender);
        return MerkleProof.verify(_proof, _root, _leaf);
    }

    /**
     * @dev Store value in variable
     * @param num value to store
     */
    // function publishInsurance();

    function store(uint256 num) public {
        number = num;
    }

    /**
     * @dev Return value 
     * @return value of 'number'
     */
    function retrieve() public view returns (uint256){
        return number;
    }
}
