require('dotenv').config();
const readline = require('readline');
const { logger, CHAIN_ID } = require('./src/config');
const { loadPrivateKeys, loadProxies, privateKeys, initializeWallet, provider } = require('./src/wallet');
const { checkNetworkSync, handleUploadFlow } = require('./src/uploader');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  try {
    logger.banner();
    loadPrivateKeys();
    loadProxies();

    logger.loading('Checking network status...');
    const network = await provider.getNetwork();
    if (BigInt(network.chainId) !== BigInt(CHAIN_ID)) {
      throw new Error(`Invalid chainId: expected ${CHAIN_ID}, got ${network.chainId}`);
    }
    logger.success(`Connected to network: chainId ${network.chainId}`);

    const isSynced = await checkNetworkSync();
    if (!isSynced) throw new Error('Network not synced');

    console.log('\x1b[36mAvailable wallets:\x1b[0m');
    privateKeys.forEach((key, index) => {
      const wallet = initializeWallet(index);
      console.log(`\x1b[32m[${index + 1}]\x1b[0m ${wallet.address}`);
    });
    console.log();

    const input = await askQuestion('How many files to upload per wallet? ');
    const count = parseInt(input);
    if (isNaN(count) || count <= 0) {
      logger.error('Invalid input. Must be a number > 0.');
      rl.close(); process.exit(1);
    }

    await handleUploadFlow(count);
    rl.close();
    logger.bye('Upload completed ~ Bye bang!');
    process.exit(0);

  } catch (err) {
    logger.critical(`Main process error: ${err.message}`);
    rl.close();
    process.exit(1);
  }
}

main();
