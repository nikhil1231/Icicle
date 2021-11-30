// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.6.12;

import "@openzeppelin/contracts/access/AccessControlEnumerable.sol";
import "./interfaces/IPair.sol";
import "./interfaces/IWAVAX.sol";
import "./libraries/SafeMath.sol";
import "./libraries/IceLibrary.sol";

contract Icicle is AccessControlEnumerable {
    using SafeMath for uint256;

    bytes32 public constant MASTER_ROLE = keccak256("MASTER_ROLE");
    bytes32 public constant SLAVE_ROLE = keccak256("SLAVE_ROLE");
    IWAVAX public immutable WAVAX;

    constructor(address WAVAXAddr) {
        WAVAX = IWAVAX(WAVAXAddr);
        _setupRole(MASTER_ROLE, msg.sender);
        _setRoleAdmin(SLAVE_ROLE, MASTER_ROLE);
    }

    receive() external payable {
        // only accept AVAX from unwrapping via the WAVAX contract
        require(msg.sender == address(WAVAX), "ERROR 1"); // Can't send directly
    }

    function deposit() external payable {
        WAVAX.deposit{value: msg.value}();
    }

    function withdraw(uint256 amount) external onlyRole(SLAVE_ROLE) {
        // Unwrap and send
        require(
            amount <= WAVAX.balanceOf(address(this)),
            "ERROR 7" // Withdrawing too much
        );
        WAVAX.withdraw(amount);
        payable(msg.sender).transfer(amount);
    }

    function addSlave(address addr) external {
        grantRole(SLAVE_ROLE, addr);
    }

    function removeSlave(address addr) external {
        revokeRole(SLAVE_ROLE, addr);
    }

    function arb(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata tokens,
        address[] calldata lps
    ) external onlyRole(SLAVE_ROLE) returns (uint256[] memory amounts) {
        require(tokens[0] == address(WAVAX), "ERROR 2"); // ICE: Must start with WAVAX
        require(
            tokens[tokens.length - 1] == address(WAVAX),
            "ERROR 3" // ICE: Must end with WAVAX
        );
        require(
            lps.length == tokens.length - 1,
            "ERROR 4" // ICE: require(#lps = #tokens - 1)
        );

        amounts = IceLibrary.getAmountsOut(amountIn, tokens, lps);
        require(
            amounts[amounts.length - 1] >= amountOutMin,
            "ERROR 5" // ICE: INSUFFICIENT_OUTPUT_AMOUNT
        );

        uint256 _balance = WAVAX.balanceOf(address(this));

        assert(IWAVAX(WAVAX).transfer(lps[0], amounts[0]));
        _swap(amounts, tokens, lps);

        // Sanity check, including poisonous tokens
        require(
            WAVAX.balanceOf(address(this)) >= _balance.add(amountOutMin),
            "ERROR 6" // FINAL CHECK
        );
    }

    function _swap(
        uint256[] memory amounts,
        address[] memory tokens,
        address[] memory lps
    ) private {
        for (uint256 i; i < tokens.length - 1; i++) {
            (address input, address output) = (tokens[i], tokens[i + 1]);
            (address token0, ) = IceLibrary.sortTokens(input, output);
            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));
            address to = i < tokens.length - 2 ? lps[i + 1] : address(this);
            IPair(lps[i]).swap(amount0Out, amount1Out, to, new bytes(0));
        }
    }
}
