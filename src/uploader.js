// src/uploader.js
const crypto = require('crypto');
const { ethers } = require('ethers');
const { logger, INDEXER_URL, EXPLORER_URL, METHOD_ID, CHAIN_ID, parseEther, parseUnits, formatEther, IMAGE_SOURCES, delay } = require('./config');
const { provider, createAxiosInstance } = require('./wallet');

function getRandomUserAgent() {
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0'
  ];
  return userAgents[Math.floor(Math.random() * userAgents.length)];
}

async function fetchRandomImage() {
  try {
    logger.loading('Fetching random image...');
    const axiosInstance = createAxiosInstance(getRandomUserAgent());
    const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
    const response = await axiosInstance.get(source.url, { responseType: source.responseType });
    logger.done('Image fetched successfully');
    return response.data;
  } catch (err) {
    logger.fail(`Error fetching image: ${err.message}`);
    throw err;
  }
}

async function checkFileExists(fileHash) {
  try {
    const axiosInstance = createAxiosInstance(getRandomUserAgent());
    const response = await axiosInstance.get(`${INDEXER_URL}/file/info/${fileHash}`);
    return response.data.exists || false;
  } catch (err) {
    logger.warn(`Failed to check file hash: ${err.message}`);
    return false;
  }
}

async function prepareImageData(imageBuffer) {
  const MAX_ATTEMPTS = 5;
  let attempt = 1;

  while (attempt <= MAX_ATTEMPTS) {
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now().toString();
      const hashInput = Buffer.concat([
        Buffer.from(imageBuffer),
        Buffer.from(salt),
        Buffer.from(timestamp)
      ]);
      const hash = '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
      const exists = await checkFileExists(hash);
      if (exists) {
        logger.warn(`Hash already exists, retrying...`);
        attempt++;
        continue;
      }
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      logger.done(`Generated file hash: ${hash}`);
      return { root: hash, data: imageBase64 };
    } catch (err) {
      logger.error(`Hash error (attempt ${attempt}): ${err.message}`);
      attempt++;
    }
  }
  throw new Error(`Failed to generate unique hash after ${MAX_ATTEMPTS} attempts`);
}

async function uploadToStorage(imageData, wallet, walletIndex) {
  const MAX_RETRIES = 3;
  const TIMEOUT = 300000;
  let attempt = 1;

  const balance = await provider.getBalance(wallet.address);
  const min = parseEther('0.0015');
  if (BigInt(balance) < BigInt(min)) throw new Error(`Low balance: ${formatEther(balance)} OG`);

  while (attempt <= MAX_RETRIES) {
    try {
      logger.loading(`Uploading file... [Attempt ${attempt}]`);
      const axiosInstance = createAxiosInstance(getRandomUserAgent());

      await axiosInstance.post(`${INDEXER_URL}/file/segment`, {
        root: imageData.root,
        index: 0,
        data: imageData.data,
        proof: {
          siblings: [imageData.root],
          path: []
        }
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      logger.done('Segment uploaded');

      const contentHash = crypto.randomBytes(32);
      const calldata = ethers.concat([
        Buffer.from(METHOD_ID.slice(2), 'hex'),
        Buffer.from('0000000000000000000000000000000000000000000000000000000000000020', 'hex'),
        Buffer.from('0000000000000000000000000000000000000000000000000000000000000014', 'hex'),
        Buffer.from('0000000000000000000000000000000000000000000000000000000000000060', 'hex'),
        Buffer.from('0000000000000000000000000000000000000000000000000000000000000080', 'hex'),
        Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'),
        Buffer.from('0000000000000000000000000000000000000000000000000000000000000001', 'hex'),
        contentHash,
        Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex')
      ]);

      const value = parseEther('0.000839233398436224');
      const gasPrice = parseUnits('1.029599997', 'gwei');
      let gasLimit;

      try {
        const est = await provider.estimateGas({ to: wallet.address, data: calldata, value });
        gasLimit = est * 15n / 10n;
        logger.done(`Gas limit: ${gasLimit}`);
      } catch {
        gasLimit = 300000n;
        logger.warn('Gas estimate failed. Using default.');
      }

      const tx = await wallet.sendTransaction({
        to: wallet.address,
        data: calldata,
        value,
        chainId: CHAIN_ID,
        gasPrice,
        gasLimit
      });

      logger.info(`TX sent: ${tx.hash}`);
      logger.info(`Explorer: ${EXPLORER_URL}${tx.hash}`);

      const receipt = await Promise.race([
        tx.wait(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), TIMEOUT))
      ]);

      if (receipt.status === 1) {
        logger.success(`Confirmed in block ${receipt.blockNumber}`);
        return receipt;
      } else throw new Error('TX failed');

    } catch (err) {
      logger.error(`Upload attempt ${attempt} failed: ${err.message}`);
      if (attempt < MAX_RETRIES) {
        await delay(5000);
        attempt++;
      } else throw err;
    }
  }
}

module.exports = {
  fetchRandomImage,
  prepareImageData,
  uploadToStorage
};
