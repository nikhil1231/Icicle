import {
  Contract,
  ContractFactory
} from "ethers"
import { ethers } from "hardhat"
import { addToEnv } from "./_env"

export const main = async (WAVAXAddress: String): Promise<any> => {

  const [deployer] = await ethers.getSigners();

  console.log("Deploying contract with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Icicle: ContractFactory = await ethers.getContractFactory("Icicle")
  const ice: Contract = await Icicle.deploy(WAVAXAddress)

  await ice.deployed()
  console.log(`Icicle deployed to: ${ice.address}`)

  addToEnv("ICE", ice.address)
}
