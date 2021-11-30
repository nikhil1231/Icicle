import { task } from "hardhat/config"
import { Contract } from "ethers"
import "@nomiclabs/hardhat-ethers"
import { getEntry } from "./_env"

task("add-slave", "Adds a slave")
  .addParam("address", "The slave address")
  .setAction(async (args, { ethers }) => {
    const [master] = await ethers.getSigners();

    const ice: Contract = await ethers.getContractAt("Icicle", getEntry('ICE'))

    await ice.connect(master).addSlave(args.address)

    if (await ice.connect(master).isSlave(args.address)) {
      console.log(`Added ${args.address} as slave.`)
    } else {
      console.log(`Error adding slave.`)
    }
  });
