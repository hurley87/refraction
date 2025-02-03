// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PointsProtocol is Ownable, Pausable, ReentrancyGuard {
    struct Checkpoint {
        uint256 points;
        bool isActive;
    }

    struct UserCheckin {
        mapping(uint256 => bool) checkedIn;
        uint256 totalPoints;
        uint256 lastCheckInTime;
        uint256 checkInCount;
    }

    mapping(address => UserCheckin) public users;
    mapping(uint256 => Checkpoint) public checkpoints;
    uint256 public nextCheckpointId = 1;
    
    uint256 public maxPointsPerCheckpoint = 1000;
    
    event CheckIn(address indexed user, uint256 checkpointId, uint256 points);
    event PointsUpdated(uint256 checkpointId, uint256 newPoints);
    event CheckpointAdded(uint256 checkpointId, uint256 points);
    event CheckpointStatusChanged(uint256 checkpointId, bool isActive);
    event MaxPointsUpdated(uint256 newMaxPoints);

    constructor() Ownable(msg.sender) {}

    function checkIn(address user, uint256 checkpointId) external whenNotPaused nonReentrant onlyOwner {
        require(checkpoints[checkpointId].isActive, "Checkpoint does not exist or inactive");
        require(!users[user].checkedIn[checkpointId], "Already checked in");

        users[user].checkedIn[checkpointId] = true;
        users[user].totalPoints += checkpoints[checkpointId].points;
        users[user].lastCheckInTime = block.timestamp;
        users[user].checkInCount++;

        emit CheckIn(user, checkpointId, checkpoints[checkpointId].points);
    }

    function updateCheckpointPoints(uint256 checkpointId, uint256 newPoints) external onlyOwner {
        require(checkpoints[checkpointId].isActive, "Checkpoint does not exist");
        require(newPoints <= maxPointsPerCheckpoint, "Points exceed maximum allowed");

        checkpoints[checkpointId].points = newPoints;
        emit PointsUpdated(checkpointId, newPoints);
    }

    function addCheckpoint(uint256 points) external onlyOwner {
        require(points <= maxPointsPerCheckpoint, "Points exceed maximum allowed");

        uint256 checkpointId = nextCheckpointId++;
        checkpoints[checkpointId] = Checkpoint(points, true);
        emit CheckpointAdded(checkpointId, points);
    }

    function setCheckpointStatus(uint256 checkpointId, bool isActive) external onlyOwner {
        require(checkpoints[checkpointId].points > 0, "Checkpoint does not exist");
        checkpoints[checkpointId].isActive = isActive;
        emit CheckpointStatusChanged(checkpointId, isActive);
    }

    function setMaxPointsPerCheckpoint(uint256 newMaxPoints) external onlyOwner {
        maxPointsPerCheckpoint = newMaxPoints;
        emit MaxPointsUpdated(newMaxPoints);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getUserPoints(address user) external view returns (uint256) {
        return users[user].totalPoints;
    }

    function getUserCheckInCount(address user) external view returns (uint256) {
        return users[user].checkInCount;
    }

    function getUserLastCheckIn(address user) external view returns (uint256) {
        return users[user].lastCheckInTime;
    }

    function getCheckpointDetails(uint256 checkpointId) 
        external 
        view 
        returns (uint256 points, bool isActive) 
    {
        Checkpoint memory checkpoint = checkpoints[checkpointId];
        return (checkpoint.points, checkpoint.isActive);
    }

}