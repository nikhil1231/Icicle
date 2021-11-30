import { existsSync, readFileSync, writeFileSync } from "fs"
import { parse, stringify } from 'envfile'
import * as dotenv from 'dotenv'

dotenv.config()

const ENV_PATH = './.env'

export const addToEnv = (key : string, val : string) => {
  const envRaw = existsSync(ENV_PATH) ? readFileSync(ENV_PATH).toString() : ""
  const env = parse(envRaw)

  env[key] = val

  writeFileSync(ENV_PATH, stringify(env))
}

export const keyExists = (key : string) => {
  if (!existsSync(ENV_PATH)) return false

  const envRaw = readFileSync(ENV_PATH).toString()
  const env = parse(envRaw)

  return key in env
}

export const getEntry = (key : string) => {
  return process.env[key]
}