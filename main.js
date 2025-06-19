require('dotenv').config();
const readline = require('readline');
const { logger, CHAIN_ID, delay } = require('./src/config');
const { loadPrivateKeys, loadProxies, privateKeys, initializeWallet, provider } = require('./src/wallet');
const { checkNetworkSync, handleUploadFlow } = require('./src/uploader');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => resolve(answer));
  });
};

async function main() {
  try {
    logger.banner();

    // Load keys & proxy
    loadPrivateKeys();
    loadProxies();

    // Network check
    logger.loading('Checking network status...');
    const network = await provider.getNetwork();
    if (BigInt(network.chainId) !== BigInt(CHAIN_ID)) {
      throw new Error(`Invalid chainId: expected ${CHAIN_ID}, got ${network.chainId}`);
    }
    logger.success(`Connected to network: chainId ${network.chainId}`);

    const isNetworkSynced = await checkNetworkSync();
    if (!isNetworkSynced) {
      throw new Error('Network is not synced');
    }

    // Tampilkan wallet list
    console.log('\x1b[36mAvailable wallets:\x1b[0m');
    privateKeys.forEach((key, index) => {
      const wallet = initializeWallet(index);
      console.log(`\x1b[32m[${index + 1}]\x1b[0m ${wallet.address}`);
    });
    console.log();

    // Ask input count
    const answer = await askQuestion('How many files to upload per wallet? ');
    const count = parseInt(answer);
    if (isNaN(count) || count <= 0) {
      logger.error('Invalid number. Please enter a number greater than 0.');
      rl.close();
      process.exit(1);
      return;
    }

    // Jalankan upload
    await handleUploadFlow(count);

    // Selesai
    rl.close();
    logger.bye('Process completed ~ Bye bang !');
    process.exit(0);

  } catch (error) {
    logger.critical(`Main process error: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

main();
