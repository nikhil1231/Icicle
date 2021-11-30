import { task } from "hardhat/config"
import "@nomiclabs/hardhat-ethers"

task("withdraw", "Withdraw")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount")
  .setAction(async (args, { ethers }) => {
    const [master] = await ethers.getSigners();

    const tx = await master.sendTransaction({
      to: args.to,
      value: ethers.utils.parseEther(args.amount)
    })

    console.log(`Sent ${args.amount} to ${args.to}, txn ${tx.hash}`)
  });
