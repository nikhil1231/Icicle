import { task } from "hardhat/config"
import { Contract } from "ethers"
import "@nomiclabs/hardhat-ethers"
import { getEntry } from "./_env"

task("deposit", "Deposit from master to contract")
  .addParam("amount", "Amount")
  .setAction(async (args, { ethers }) => {
    const [master] = await ethers.getSigners();

    const ice: Contract = await ethers.getContractAt("Icicle", getEntry('ICE'))

    const tx = await ice.connect(master).deposit({
      value: ethers.utils.parseEther(args.amount)
    })

    console.log(`Deposited ${args.amount} to ${getEntry('ICE')}, txn ${tx.hash}`)
  });
