// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Agent Streak
/// @notice Daily check-in / streak game gated by Agent ID ownership.
/// @dev Free to play (gas only). No admin, no owner, no pause, no withdraw,
///      no token minting. Agent ID is checked on-chain via the registry.
///      Streaks are points on a leaderboard only - no monetary return is
///      promised or implied anywhere in this contract.

/// @notice Minimal interface of the Agent ID registry (HandleRegistry).
///         Only the functions this contract needs.
interface IAgentID {
    function balanceOf(address account) external view returns (uint256);
    function handleOf(address account) external view returns (string memory);
}

contract AgentStreak {
    /// @notice The Agent ID registry this contract trusts.
    /// @dev Mainnet (BSC, chainId 56): 0x60b9262456de011f7d15a54cdd8c48baaa8b022f
    ///      Testnet (chainId 97): the official registry does not exist there,
    ///      so a test mock is passed instead.
    IAgentID public immutable agentId;

    /// @notice UTC day (block.timestamp / 1 days) of a player's last check-in.
    mapping(address => uint256) public lastCheckInDay;
    /// @notice Current consecutive-day streak of a player.
    mapping(address => uint256) public streak;
    /// @notice Agent ID handle (without ".ai") of a player, recorded at check-in.
    mapping(address => string) public handleOfPlayer;
    /// @notice Total check-ins per player.
    mapping(address => uint256) public totalCheckIns;

    /// @notice Number of distinct players who have checked in at least once.
    uint256 public totalPlayers;
    /// @notice Total check-ins across all players.
    uint256 public totalCheckInsAll;

    /// @notice Emitted on every successful check-in.
    event CheckedIn(address indexed player, string handle, uint256 indexed day, uint256 streak);

    /// @param registry_ Address of the Agent ID registry contract.
    constructor(address registry_) {
        require(registry_ != address(0), "Registry address is zero");
        agentId = IAgentID(registry_);
    }

    /// @notice Only addresses holding at least one Agent ID may call.
    modifier onlyAgentHolder() {
        require(agentId.balanceOf(msg.sender) > 0, "Agent ID required");
        _;
    }

    /// @notice Check in once per UTC day. Consecutive days grow the streak,
    ///         a missed day resets it to 1.
    function checkIn() external onlyAgentHolder {
        uint256 today = block.timestamp / 1 days;
        require(lastCheckInDay[msg.sender] != today, "Already checked in today");

        string memory handle = agentId.handleOf(msg.sender);

        if (lastCheckInDay[msg.sender] == today - 1) {
            streak[msg.sender] += 1;
        } else {
            streak[msg.sender] = 1;
        }

        lastCheckInDay[msg.sender] = today;
        handleOfPlayer[msg.sender] = handle;
        totalCheckIns[msg.sender] += 1;
        if (totalCheckIns[msg.sender] == 1) {
            totalPlayers += 1;
        }
        totalCheckInsAll += 1;

        emit CheckedIn(msg.sender, handle, today, streak[msg.sender]);
    }

    /// @notice Full player record in one call.
    /// @return handle Agent ID handle ("" if the player never checked in).
    /// @return currentStreak Current consecutive-day streak.
    /// @return lastDay UTC day of the last check-in (0 if never).
    /// @return total Total check-ins by this player.
    function getPlayer(address player)
        external
        view
        returns (
            string memory handle,
            uint256 currentStreak,
            uint256 lastDay,
            uint256 total
        )
    {
        return (
            handleOfPlayer[player],
            streak[player],
            lastCheckInDay[player],
            totalCheckIns[player]
        );
    }
}
