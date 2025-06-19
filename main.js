require('dotenv').config();
const readline = require('readline');
const { logger, CHAIN_ID } = require('./src/config');
const { loadPrivateKeys, loadProxies, privateKeys, initializeWallet, provider } = require('./src/wallet');
const { checkNetworkSync, handleUploadFlow } = require('./src/uploader');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Fungsi tanya input
const askQuestion = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => resolve(answer));
  });
};

// Fungsi validasi input jumlah upload
async function getValidCount() {
  while (true) {
    const answer = await askQuestion('How many files to upload per wallet? ');
    const count = parseInt(answer);
    if (!isNaN(count) && count > 0) return count;
    logger.error('Invalid number. Please enter a number greater than 0.\n');
  }
}

// Fungsi utama
async function main() {
  try {
    logger.banner();

    // Load wallet dan proxy
    loadPrivateKeys();
    loadProxies();

    // Cek koneksi ke network
    logger.loading('Checking network status...');
    const network = await provider.getNetwork();
    if (BigInt(network.chainId) !== BigInt(CHAIN_ID)) {
      throw new Error(`Invalid chainId: expected ${CHAIN_ID}, got ${network.chainId}`);
    }
    logger.success(`Connected to network: chainId ${network.chainId}`);

    const isSynced = await checkNetworkSync();
    if (!isSynced) throw new Error('Network is not synced');

    // Tampilkan semua wallet
    console.log('\x1b[36mAvailable wallets:\x1b[0m');
    privateKeys.forEach((key, index) => {
      const wallet = initializeWallet(index);
      console.log(`\x1b[32m[${index + 1}]\x1b[0m ${wallet.address}`);
    });
    console.log();

    // Input jumlah file per wallet
    const count = await getValidCount();

    // Mulai proses upload
    await handleUploadFlow(count);

    // Selesai
    rl.close();
    logger.bye('Process completed ~ Bye bang !');
    process.exit(0);
  } catch (err) {
    logger.critical(`Main process error: ${err.message}`);
    rl.close();
    process.exit(1);
  }
}

main();
