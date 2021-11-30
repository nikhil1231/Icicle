import { main } from './_deploy';

const WAVAXAddress = '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7';

main(WAVAXAddress)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })