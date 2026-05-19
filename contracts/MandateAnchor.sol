// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

/// @title MandateAnchor
/// @notice Minimal on-chain anchor for PACT mandate state transitions.
///         Each call emits one event. No storage, no access control.
///         Verification is off-chain: API caller signs each anchor() tx
///         from a known signer key, the (mandateHash, txHash, sender)
///         tuple is the auditable receipt.
contract MandateAnchor {
    event MandateAnchored(
        bytes32 indexed mandateHash,
        string state,
        uint256 timestamp,
        address indexed sender
    );

    function anchor(bytes32 mandateHash, string calldata state) external {
        emit MandateAnchored(mandateHash, state, block.timestamp, msg.sender);
    }
}
