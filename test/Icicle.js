// test/Airdrop.js
// Load dependencies
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { BigNumber } = require('ethers');

///////////////////////////////////////////////////////////
// SEE https://hardhat.org/tutorial/testing-contracts.html
// FOR HELP WRITING TESTS
// USE https://github.com/gnosis/mock-contract FOR HELP
// WITH MOCK CONTRACT
///////////////////////////////////////////////////////////

const KWEI = BigNumber.from(1000)
const MWEI = KWEI.mul(KWEI)
const GWEI = MWEI.mul(KWEI)
const ETH = GWEI.mul(GWEI)

// Start test block
describe('Icicle', function () {
  before(async function () {

    this.Icicle = await ethers.getContractFactory("Icicle");
    this.Wavax = await ethers.getContractFactory("WAVAX");
    this.signers = await ethers.getSigners();
    this.OWNER = this.signers[0].address;
  });


  beforeEach(async function () {
    this.wavax = await this.Wavax.deploy()
    await this.wavax.deployed()
    this.ice = await this.Icicle.deploy(this.wavax.address)
    await this.ice.deployed()

    this.MASTER_ROLE = await this.ice.MASTER_ROLE()
    this.SLAVE_ROLE = await this.ice.SLAVE_ROLE()

    this.master = this.signers[0];
    this.slave = this.signers[1];
    this.anyone = this.signers[2];
    this.addr = this.signers[3].address;

    await this.ice.addSlave(this.slave.address)

    await this.master.sendTransaction({
      to: this.wavax.address,
      value: ETH
    })

    await this.slave.sendTransaction({
      to: this.wavax.address,
      value: ETH
    })

    await this.ice.deposit({
      value: ETH
    })
  });

  describe("Constructor", async function () {
    it('should grant creator the Master role', async function () {
      expect(await this.ice.hasRole(this.MASTER_ROLE, this.OWNER)).to.equal(true)
    });

    it('should make Master admin of Slave', async function () {
      expect(await this.ice.getRoleAdmin(this.SLAVE_ROLE)).to.equal(this.MASTER_ROLE)
    });
  });

  describe("addSlave", function () {
    it('should add a slave', async function () {
      await this.ice.addSlave(this.addr)
      expect(await this.ice.hasRole(this.SLAVE_ROLE, this.addr)).to.equal(true)
    });

    it('should not allow slave', async function () {
      await expect(
        this.ice.connect(this.slave).addSlave(this.addr)
      ).to.be.revertedWith(`AccessControl: account ${this.slave.address.toLowerCase()} is missing role ${this.MASTER_ROLE}`)
    });

    it('should not allow anyone', async function () {
      await expect(
        this.ice.connect(this.anyone).addSlave(this.addr)
      ).to.be.revertedWith(`AccessControl: account ${this.anyone.address.toLowerCase()} is missing role ${this.MASTER_ROLE}`)
    });
  });

  describe("removeSlave", function () {
    it('should remove a slave', async function () {
      expect(await this.ice.hasRole(this.SLAVE_ROLE, this.slave.address)).to.equal(true)
      await this.ice.removeSlave(this.slave.address)
      expect(await this.ice.hasRole(this.SLAVE_ROLE, this.slave.address)).to.equal(false)
    });

    it('should not allow slave', async function () {
      await expect(
        this.ice.connect(this.slave).removeSlave(this.addr)
      ).to.be.revertedWith(`AccessControl: account ${this.slave.address.toLowerCase()} is missing role ${this.MASTER_ROLE}`)
    });

    it('should not allow anyone', async function () {
      await expect(
        this.ice.connect(this.anyone).removeSlave(this.addr)
      ).to.be.revertedWith(`AccessControl: account ${this.anyone.address.toLowerCase()} is missing role ${this.MASTER_ROLE}`)
    });
  });

  describe("deposit", function () {
    it('should wrap AVAX', async function () {
      const contractBalance = await this.wavax.balanceOf(this.ice.address)
      expect(await ethers.provider.getBalance(this.ice.address)).to.equal(0)

      const depositAmount = KWEI
      await this.ice.connect(this.slave).deposit({
        value: depositAmount
      })

      expect(await this.wavax.balanceOf(this.ice.address)).to.equal(contractBalance.add(depositAmount))
      expect(await ethers.provider.getBalance(this.ice.address)).to.equal(0)
    });

    it('should allow WAVAX', async function () {
      const contractBalance = await this.wavax.balanceOf(this.ice.address)
      expect(await ethers.provider.getBalance(this.ice.address)).to.equal(0)

      const depositAmount = KWEI
      await this.wavax.connect(this.slave).transfer(this.ice.address, depositAmount)

      expect(await this.wavax.balanceOf(this.ice.address)).to.equal(contractBalance.add(depositAmount))
      expect(await ethers.provider.getBalance(this.ice.address)).to.equal(0)
    });

    it('should not allow sending directly', async function () {
      const depositAmount = KWEI
      await expect(this.slave.sendTransaction({
        to: this.ice.address,
        value: depositAmount
      })).to.be.revertedWith('Cannot send directly')
    });
  });

  describe("withdraw", function () {
    it('should allow slave', async function () {
      const contractBalance = await this.wavax.balanceOf(this.ice.address)
      expect(await ethers.provider.getBalance(this.ice.address)).to.equal(0)

      const withdrawAmount = KWEI
      await this.ice.connect(this.slave).withdraw(withdrawAmount)

      // TODO: need to account for gas
      // expect(await ethers.provider.getBalance(this.slave.address)).to.equal(slaveBalance.add(withdrawAmount))
      expect(await this.wavax.balanceOf(this.ice.address)).to.equal(contractBalance.sub(withdrawAmount))
      expect(await ethers.provider.getBalance(this.ice.address)).to.equal(0)
    });

    it('should not allow withdraw more than balance', async function () {
      const contractBalance = await this.wavax.balanceOf(this.ice.address)
      await expect(
        this.ice.connect(this.slave).withdraw(contractBalance.add(1))
      ).to.be.revertedWith("Withdrawing too much")
    });

    it('should not allow anyone', async function () {
      await expect(
        this.ice.connect(this.anyone).withdraw(1)
      ).to.be.revertedWith(`AccessControl: account ${this.anyone.address.toLowerCase()} is missing role ${this.SLAVE_ROLE}`)
    });
  });

  describe("arb", function () {
    before(async function () {
      this.Router = await ethers.getContractFactory("Router")
      this.Token = await ethers.getContractFactory("TestERC20");
      this.Pair = await ethers.getContractFactory("Pair");
      this.Lib = await ethers.getContractFactory("TestIceLibrary");

      this.lib = await this.Lib.deploy()
      await this.lib.deployed()

      this.router = await this.Router.deploy()
      await this.router.deployed()

      this.tokenA = await this.Token.deploy("Token A", "TA")
      this.tokenB = await this.Token.deploy("Token B", "TB")
      await this.tokenA.deployed()
      await this.tokenB.deployed()

      await this.tokenA.mint(ETH)
      await this.tokenB.mint(ETH)

    });

    beforeEach(async function () {
      this.pairAW = await this.Pair.deploy()
      await this.pairAW.deployed()
      await this.pairAW.initialize(this.tokenA.address, this.wavax.address)

      this.pairBW = await this.Pair.deploy()
      await this.pairBW.deployed()
      await this.pairBW.initialize(this.tokenB.address, this.wavax.address)

      this.pairAB = await this.Pair.deploy()
      await this.pairAB.deployed()
      await this.pairAB.initialize(this.tokenA.address, this.tokenB.address)

      await this.wavax.approve(this.router.address, ETH)
      await this.tokenA.approve(this.router.address, ETH)
      await this.tokenB.approve(this.router.address, ETH)
    });

    it("should fail if doesn't start with WAVAX", async function () {
      await expect(
        this.ice.connect(this.slave).arb(
          KWEI,
          KWEI,
          [this.tokenA.address, this.tokenB.address, this.wavax.address],
          [this.pairAB.address, this.pairBW.address]
        )
      ).to.be.revertedWith("ICE: Must start with WAVAX")
    });

    it("should fail if doesn't end with WAVAX", async function () {
      await expect(
        this.ice.connect(this.slave).arb(
          KWEI,
          KWEI,
          [this.wavax.address, this.tokenB.address, this.tokenA.address],
          [this.pairBW.address, this.pairAB.address]
        )
      ).to.be.revertedWith("ICE: Must end with WAVAX")
    });

    it("should fail with bad param lengths", async function () {
      await expect(
        this.ice.connect(this.slave).arb(
          KWEI,
          KWEI,
          [this.wavax.address, this.tokenA.address, this.tokenB.address, this.wavax.address],
          [this.pairAW.address, this.pairAB.address]
        )
      ).to.be.revertedWith("ICE: require(#lps = #tokens - 1)")
    });

    it("should fail if output < input", async function () {
      await this.router.setLiquidity(this.wavax.address, this.tokenA.address, GWEI, GWEI, this.pairAW.address)
      await this.router.setLiquidity(this.tokenA.address, this.tokenB.address, GWEI, GWEI, this.pairAB.address)
      await this.router.setLiquidity(this.tokenB.address, this.wavax.address, GWEI, GWEI, this.pairBW.address)

      await expect(
        this.ice.connect(this.slave).arb(
          MWEI,
          MWEI.mul(2), // Min amount out
          [this.wavax.address, this.tokenA.address, this.tokenB.address, this.wavax.address],
          [this.pairAW.address, this.pairAB.address, this.pairBW.address]
        )
      ).to.be.revertedWith("ICE: INSUFFICIENT_OUTPUT_AMOUNT")
    });

    it("should succeed if input (+ gas) < output", async function () {

      const startBalance = await this.wavax.balanceOf(this.ice.address)
      const amountIn = KWEI

      await this.router.setLiquidity(this.wavax.address, this.tokenA.address, MWEI, MWEI.mul(2), this.pairAW.address)
      await this.router.setLiquidity(this.tokenA.address, this.tokenB.address, MWEI, MWEI.mul(2), this.pairAB.address)
      await this.router.setLiquidity(this.tokenB.address, this.wavax.address, MWEI, MWEI.mul(2), this.pairBW.address)

      const startReserveWavax = (await this.pairBW.getReserves())[this.wavax.address < this.tokenB.address ? 0 : 1]

      const amountsOut = await this.lib.getAmountsOut(
        amountIn,
        [this.wavax.address, this.tokenA.address, this.tokenB.address, this.wavax.address],
        [this.pairAW.address, this.pairAB.address, this.pairBW.address]
      )
      const amountOut = amountsOut[amountsOut.length - 1]

      await this.ice.connect(this.slave).arb(
        amountIn,
        amountIn,
        [this.wavax.address, this.tokenA.address, this.tokenB.address, this.wavax.address],
        [this.pairAW.address, this.pairAB.address, this.pairBW.address]
      )

      const endReserveWavax = (await this.pairBW.getReserves())[this.wavax.address < this.tokenB.address ? 0 : 1]

      expect(amountOut).to.equal(startReserveWavax.sub(endReserveWavax)) // sanity check

      expect(await this.wavax.balanceOf(this.ice.address)).to.equal(startBalance.sub(amountIn).add(amountOut))
    });

    it('should not allow anyone', async function () {
      await expect(
        this.ice.connect(this.anyone).arb(
          KWEI,
          KWEI,
          [this.wavax.address, this.tokenA.address, this.tokenB.address, this.wavax.address],
          [this.pairAW.address, this.pairAB.address, this.pairBW.address]
        )
      ).to.be.revertedWith(`AccessControl: account ${this.anyone.address.toLowerCase()} is missing role ${this.SLAVE_ROLE}`)
    });
  });

});