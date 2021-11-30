import { task } from "hardhat/config"
import { Wallet } from "ethers"
import { addToEnv, keyExists } from "./_env"

task("create-wallet", "Creates a new wallet")
  .setAction(async () => {
    const key = "MNEMONIC"
    if (keyExists(key)) return console.log("ERROR: wallet already exists")

    const wallet = Wallet.createRandom()
    console.log(`Created new wallet: ${wallet.address}`)

    addToEnv("PK", wallet._signingKey().privateKey)
    addToEnv(key, wallet._mnemonic().phrase)
    addToEnv("MASTER_ADDRESS", wallet.address)
  });
