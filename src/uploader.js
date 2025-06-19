// main.js
const readline = require('readline');
const { logger, delay } = require('./config');
const { provider, loadPrivateKeys, loadProxies, privateKeys, initializeWallet } = require('./wallet');
const { fetchRandomImage, prepareImageData, uploadToStorage } = require('./uploader');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function checkNetwork() {
  logger.loading('Checking network status...');
  const network = await provider.getNetwork();
  if (BigInt(network.chainId) !== BigInt(16601)) {
    throw new Error(`Invalid chainId: expected 16601, got ${network.chainId}`);
  }
  logger.success(`Connected to network: chainId ${network.chainId}`);
  const block = await provider.getBlockNumber();
  logger.done(`Network synced at block ${block}`);
}

async function start() {
  try {
    logger.banner();
    loadPrivateKeys();
    loadProxies();
    await checkNetwork();

    console.log("\x1b[36mAvailable wallets:\x1b[0m");
    privateKeys.forEach((key, i) => {
      const wallet = initializeWallet(key);
      console.log(`\x1b[32m[${i + 1}]\x1b[0m ${wallet.address}`);
    });
    console.log();

    rl.question('How many files to upload per wallet? ', async (input) => {
      const count = parseInt(input);
      if (isNaN(count) || count <= 0) {
        logger.error('Invalid number. Please enter a number > 0.');
        rl.close();
        return;
      }

      const total = count * privateKeys.length;
      logger.info(`Starting ${total} uploads (${count} per wallet)`);
      let success = 0;
      let fail = 0;

      for (let i = 0; i < privateKeys.length; i++) {
        const wallet = initializeWallet(privateKeys[i]);
        logger.section(`Processing Wallet #${i + 1} [${wallet.address}]`);

        for (let j = 0; j < count; j++) {
          const uploadNum = (i * count) + (j + 1);
          logger.process(`Upload ${uploadNum}/${total} (Wallet #${i + 1}, File #${j + 1})`);

          try {
            const image = await fetchRandomImage();
            const imageData = await prepareImageData(image);
            await uploadToStorage(imageData, wallet, i);
            logger.success(`Upload ${uploadNum} completed`);
            success++;
            if (uploadNum < total) await delay(3000);
          } catch (err) {
            logger.fail(`Upload ${uploadNum} failed: ${err.message}`);
            fail++;
            await delay(5000);
          }
        }

        if (i < privateKeys.length - 1) {
          logger.loading('Switching wallet...');
          await delay(10000);
        }
      }

      logger.section('Upload Summary');
      logger.summary(`Total wallets: ${privateKeys.length}`);
      logger.summary(`Uploads per wallet: ${count}`);
      logger.summary(`Total attempted: ${total}`);
      if (success > 0) logger.success(`Successful: ${success}`);
      if (fail > 0) logger.fail(`Failed: ${fail}`);
      logger.bye('Process completed ~ Bye bang !');
      rl.close();
    });

  } catch (err) {
    logger.critical(`Fatal error: ${err.message}`);
    rl.close();
  }
}

start();
