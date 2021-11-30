import { main } from './_deploy';

const WAVAXAddress = '0xd00ae08403B9bbb9124bB305C09058E32C39A48c';

main(WAVAXAddress)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })