// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.6.12;

import "../libraries/IceLibrary.sol";
import "../libraries/SafeMath.sol";
import "./Pair.sol";
import "./IERC20.sol";

contract Router {
    using SafeMath for uint256;

    function setLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountA,
        uint256 amountB,
        address lp
    ) external {
        IERC20(tokenA).transferFrom(msg.sender, lp, amountA);
        IERC20(tokenB).transferFrom(msg.sender, lp, amountB);
        Pair(lp).mint(msg.sender);
    }
}
