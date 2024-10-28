// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Events is Ownable {

    uint256 public totalCheckpoints = 5;
    
    // Mapping to track which checkpoints a user has checked into
    mapping(address => bool[5]) public checkInStatus;

    // Event to emit when a user checks in
    event CheckIn(address indexed user, uint256 checkpoint);

    constructor() Ownable(msg.sender) {}

    // Modifier to ensure that the checkpoint is valid and user hasn't checked in already
    modifier canCheckIn(uint256 checkpoint, address user) {
        require(checkpoint < totalCheckpoints, "Invalid checkpoint");
        require(!checkInStatus[user][checkpoint], "User already checked in to this checkpoint");
        _;
    }

    // Function to check in to a checkpoint
    function checkIn(uint256 checkpoint, address user) external canCheckIn(checkpoint, user) onlyOwner {
        checkInStatus[user][checkpoint] = true;
        emit CheckIn(user, checkpoint);
    }

    // Function to get the check-in status of a user at all checkpoints
    function getCheckInStatus(address user) external view returns (bool[5] memory) {
        return checkInStatus[user];
    }
}
