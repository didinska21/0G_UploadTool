const { logger, delay } = require('./config');
const { provider, privateKeys, initializeWallet } = require('./wallet');
const { fetchRandomImage, prepareImageData, uploadToStorage } = require('./upload');

async function checkNetworkSync() {
  try {
    logger.loading('Checking network sync...');
    const block = await provider.getBlockNumber();
    logger.done(`Network synced at block ${block}`);
    return true;
  } catch (err) {
    logger.fail(`Failed to fetch block: ${err.message}`);
    return false;
  }
}

async function handleUploadFlow(count) {
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
      logger.loading('Switching to next wallet...');
      await delay(10000);
    }
  }

  logger.section('Upload Summary');
  logger.summary(`Total wallets: ${privateKeys.length}`);
  logger.summary(`Uploads per wallet: ${count}`);
  logger.summary(`Total attempted: ${total}`);
  if (success > 0) logger.success(`Successful: ${success}`);
  if (fail > 0) logger.fail(`Failed: ${fail}`);
}

module.exports = {
  checkNetworkSync,
  handleUploadFlow
};
