// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.2 <0.9.0;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title CoverPass
 * @notice Smart Contract for insurance verification using Bitcoin-style block approach
 */
contract CoverPass is AccessControl {

    // Roles
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    struct InsuranceBlock {
        bytes32 merkleRoot;
        uint256 timestamp;
        uint256 blockNumber;
        address insurer;
        bytes32 previousBlockHash;
        uint256 insuranceCount;
    }

    // struct Policy {
    //     uint policyID;
    //     string data;
    //     address user;
    //     uint expiry;
    // }

    // Only store current block on-chain
    InsuranceBlock public currentBlock;
    
    // Total statistics
    uint256 public totalBlocks;
    uint256 public totalInsuranceDocuments;

    // ------------------------
    // Events
    // ------------------------

    event InsuranceBlockCreated(
        bytes32 indexed merkleRoot,
        uint256 timestamp,
        uint256 indexed blockNumber,
        address indexed insurer,
        bytes32 previousBlockHash,
        uint256 insuranceCount
    );

    // Request-response pattern
    event MerkleTreeRequest(
        address indexed sender,
        uint256 indexed blockNumber,
        bytes32 docHash,
        uint256 timestamp
    );

    event MerkleTreeResponse(
        address indexed insurer,
        uint256 indexed blockNumber,
        bytes32 merkleRoot,
        bytes32[] proof,
        uint256 timestamp
    );

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        
        // Initialize genesis block
        currentBlock = InsuranceBlock({
            merkleRoot: bytes32(0),
            timestamp: block.timestamp,
            blockNumber: 0,
            insurer: address(0),
            previousBlockHash: bytes32(0),
            insuranceCount: 0
        });
        
        totalBlocks = 0;
        totalInsuranceDocuments = 0;
    }


    // ------------------------
    // Insurer functions
    // ------------------------

    /**
     * @notice Create new insurance block
     */
    function createInsuranceBlock(
        bytes32 newRoot,
        uint256 insuranceCount
    ) external onlyRole(INSURER_ROLE) {
        require(newRoot != bytes32(0), "Invalid merkle root");
        require(insuranceCount > 0, "Insurance count must be positive");
        
        // Calculate new block hash
        bytes32 newBlockHash = keccak256(abi.encodePacked(
            newRoot,
            block.timestamp,
            block.number,
            currentBlock.previousBlockHash
        ));
        
        // Emit event for historical data (stored in blockchain logs)
        emit InsuranceBlockCreated(
            newRoot,
            block.timestamp,
            currentBlock.blockNumber + 1,
            msg.sender,
            currentBlock.previousBlockHash,
            insuranceCount
        );
        
        // Update current state
        currentBlock.merkleRoot = newRoot;
        currentBlock.timestamp = block.timestamp;
        currentBlock.blockNumber++;
        currentBlock.insurer = msg.sender;
        currentBlock.previousBlockHash = newBlockHash;
        currentBlock.insuranceCount = insuranceCount;
        
        totalBlocks++;
        totalInsuranceDocuments += insuranceCount;
    }

    /**
    * @notice Provide Merkle tree data in response to a request
    */
    function provideMerkleTree(
        uint256 blockNumber,
        bytes32 merkleRoot,
        bytes32 docHash,
        bytes32[] calldata proof
    ) external onlyRole(INSURER_ROLE) {
        bool valid = MerkleProof.verify(proof, merkleRoot, docHash);

        require(valid, "Invalid Merkle proof");
        
        emit MerkleTreeResponse(
            msg.sender,
            blockNumber,
            merkleRoot,
            proof,
            block.timestamp
        );
    }


    // ------------------------
    // Verifier functions
    // ------------------------

    /**
    * @notice Request Merkle tree data for a specific block for verification
    */
    function requestMerkleTree(
        uint policyID,
        uint256 blockNumber,
        address user
    ) external onlyRole(VERIFIER_ROLE) {
        require(blockNumber <= currentBlock.blockNumber, "Block doesn't exist");
        require(blockNumber > 0, "Invalid block number");

        bytes32 docHash = keccak256(abi.encodePacked(policyID, user));
    
        emit MerkleTreeRequest(
            msg.sender,
            blockNumber,
            docHash,
            block.timestamp
        );
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
    function whitelistVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, verifier);
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
    function revokeVerifier(address verifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(VERIFIER_ROLE, verifier);
    }


    // ------------------------
    // View functions
    // ------------------------

    /**
     * @notice Get current block state
     */
    function getCurrentBlock() external view returns (InsuranceBlock memory) {
        return currentBlock;
    }

    /**
     * @notice Get merkle root of current block
     */
    function getCurrentMerkleRoot() external view returns (bytes32) {
        return currentBlock.merkleRoot;
    }

    /**
     * @notice Get total statistics
     */
    function getStatistics() external view returns (uint256, uint256) {
        return (totalBlocks, totalInsuranceDocuments);
    }

    /**
    * @notice Request Merkle tree data for a specific block for verification
    */
    function requestMerkleTree(
        uint policyID,
        uint256 blockNumber
    ) external {
        require(blockNumber <= currentBlock.blockNumber, "Block doesn't exist");
        require(blockNumber > 0, "Invalid block number");

        bytes32 docHash = keccak256(abi.encodePacked(policyID, msg.sender));
    
        emit MerkleTreeRequest(
            msg.sender,
            blockNumber,
            docHash,
            block.timestamp
        );
    }
}