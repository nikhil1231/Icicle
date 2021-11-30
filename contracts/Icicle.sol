// SPDX-License-Identifier: UNLICENSED

pragma solidity >=0.6.12;

import "./interfaces/IPair.sol";
import "./interfaces/IWAVAX.sol";
import "./libraries/SafeMath.sol";
import "./libraries/IceLibrary.sol";

// 2,248,495 gas
contract Icicle {
    using SafeMath for uint256;

    IWAVAX public immutable WAVAX;
    address public immutable MASTER;

    mapping(address => bool) slaves;

    constructor(address WAVAXAddr) {
        WAVAX = IWAVAX(WAVAXAddr);
        MASTER = msg.sender;
    }

    modifier onlyMaster() {
        require(msg.sender == MASTER, "ERROR 403M");
        _;
    }

    modifier onlySlave() {
        require(slaves[msg.sender], "ERROR 403S");
        _;
    }

    receive() external payable {
        // only accept AVAX from unwrapping via the WAVAX contract
        require(msg.sender == address(WAVAX), "ERROR 1"); // Can't send directly
    }

    function deposit() external payable {
        WAVAX.deposit{value: msg.value}();
    }

    function withdraw(uint256 amount) external onlySlave {
        // Unwrap and send
        require(
            amount <= WAVAX.balanceOf(address(this)),
            "ERROR 7" // Withdrawing too much
        );
        WAVAX.withdraw(amount);
        payable(msg.sender).transfer(amount);
    }

    function addSlave(address addr) external onlyMaster {
        if (!slaves[addr]) {
            slaves[addr] = true;
        }
    }

    function removeSlave(address addr) external onlyMaster {
        if (slaves[addr]) {
            slaves[addr] = false;
        }
    }

    function isSlave(address addr) external view onlyMaster returns (bool) {
      return slaves[addr];
    }

    function arb(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata tokens,
        address[] calldata lps
    ) external onlySlave returns (uint256[] memory amounts) {
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
