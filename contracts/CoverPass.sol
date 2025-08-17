// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title CoverPass
 * @notice Smart Contract for insurance verification using off-chain Merkle trees
 */
contract CoverPass is AccessControl {
    // Roles
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // State
    bytes32 public merkleRoot;

    // Events
    event InsurancePublished(
        address indexed insurer,
        bytes32 indexed docHash,
        uint256 index,
        bytes32 newRoot
    );
    
    event CoverageVerified(
        address indexed verifier,
        address indexed user,
        bytes32 indexed docHash,
        bool valid
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }


    // ------------------------
    // Insurer functions
    // ------------------------

    /**
     * @notice Insurers publish a new insurance document by hashing it off-chain and submitting the hash
     */
    function publishInsurance(bytes32 newRoot, uint256 index, bytes32 docHash) external onlyRole(INSURER_ROLE) {
        merkleRoot = newRoot;

        emit InsurancePublished(msg.sender, docHash, index, newRoot);
    }


    // ------------------------
    // Verifier functions
    // ------------------------

    /**
     * @notice Verifiers check whether a user has coverage using a Merkle proof
     */
    function verifyCoverage(
        address user,
        bytes32 docHash,
        bytes32[] calldata proof
    ) external onlyRole(VERIFIER_ROLE) returns (address, bytes32, bool) {
        bool valid = MerkleProof.verify(proof, merkleRoot, docHash);

        emit CoverageVerified(msg.sender, user, docHash, valid);
        return (user, docHash, valid);
    }


    // ------------------------
    // Admin functions
    // ------------------------

    /**
     * @notice Whitelist insurer
     */
    function whitelistInsurer(address insurer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(INSURER_ROLE, insurer);
    }

    /**
     * @notice Whitelist verifier
     */
    function whitelistVerifier(address caretaker) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, caretaker);
    }

    /**
     * @notice Remove authorization of insurer
     */
    function revokeInsurer(address insurer) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(INSURER_ROLE, insurer);
    }

    /**
     * @notice Remove authorization of verifier
     */
    function revokeVerifier(address caretaker) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, caretaker);
    }
}