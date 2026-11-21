// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title MockAgentID
/// @notice TEST MOCK, bukan Agent ID resmi. HANYA untuk testnet / local testing.
///         Mirrors the minimal surface of the real Agent ID registry
///         (HandleRegistry) that AgentStreak relies on: balanceOf, handleOf,
///         ownerOfHandle, isValidHandle. Minting here is free and permissionless
///         on purpose, so any test address can get a test handle.
///         NEVER deploy this on mainnet, and NEVER present it as the real
///         Agent ID registry in any UI.

contract MockAgentID {
    /// @notice address -> handle (without ".ai"), e.g. "arzen".
    mapping(address => string) public handleOf;
    /// @notice handle -> owner address.
    mapping(string => address) public ownerOfHandle;

    event TestHandleMinted(string handle, address indexed to);

    /// @notice Returns 1 if the address holds a test handle, else 0.
    function balanceOf(address account) external view returns (uint256) {
        return bytes(handleOf[account]).length != 0 ? 1 : 0;
    }

    /// @notice Handle format: 3-20 chars, only [a-z0-9].
    /// @dev Mirrors the real registry's minLen/maxLen (3/20) and charset.
    function isValidHandle(string calldata handle) external pure returns (bool) {
        bytes memory b = bytes(handle);
        if (b.length < 3 || b.length > 20) return false;
        for (uint256 i = 0; i < b.length; ++i) {
            uint8 c = uint8(b[i]);
            bool isLower = c >= 0x61 && c <= 0x7a; // a-z
            bool isDigit = c >= 0x30 && c <= 0x39; // 0-9
            if (!isLower && !isDigit) return false;
        }
        return true;
    }

    /// @notice Mint a test handle to an address. Testnet/local only.
    /// @dev Reverts on invalid handle, taken handle, or address already holding one.
    function mintTest(string calldata handle, address to) external {
        require(this.isValidHandle(handle), "Invalid handle");
        require(to != address(0), "Zero address");
        require(ownerOfHandle[handle] == address(0), "Handle taken");
        require(bytes(handleOf[to]).length == 0, "Address has handle");
        handleOf[to] = handle;
        ownerOfHandle[handle] = to;
        emit TestHandleMinted(handle, to);
    }
}
