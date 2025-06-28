
require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const { HttpsProxyAgent } = require('https-proxy-agent');

const colors = {
  reset: "\x1b[0m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m",
  red: "\x1b[31m", white: "\x1b[37m", gray: "\x1b[90m", bold: "\x1b[1m"
};
const logger = {
  info: (msg) => console.log(`${colors.green}[âœ“] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[âš ] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[âœ—] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[âœ…] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[âŸ³] ${msg}${colors.reset}`),
  process: (msg) => console.log(`\n${colors.white}[âž¤] ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.gray}[â€¦] ${msg}${colors.reset}`),
  bye: (msg) => console.log(`${colors.yellow}[â€¦] ${msg}${colors.reset}`),
  critical: (msg) => console.log(`${colors.red}${colors.bold}[âŒ] ${msg}${colors.reset}`),
  summary: (msg) => console.log(`${colors.white}[âœ“] ${msg}${colors.reset}`),
  section: (msg) => {
    const line = '='.repeat(50);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    if (msg) console.log(`${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  },
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`---------------------------------------------`);
    console.log(`<><><><><>< 0G upload file Tool ><><><><><><>`);
    console.log(`---------------------------------------------${colors.reset}\n`);
  }
};

const CHAIN_ID = 16601;
const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const CONTRACT_ADDRESS = '0x5f1d96895e442fc0168fa2f9fb1ebef93cb5035e';
const METHOD_ID = '0xef3e12dc';
const PROXY_FILE = 'proxy.txt';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_URL = 'https://chainscan-galileo.0g.ai/tx/';
const IMAGE_SOURCES = [
  { url: 'https://picsum.photos/800/600', responseType: 'arraybuffer' },
  { url: 'https://loremflickr.com/800/600', responseType: 'arraybuffer' }
];

let privateKeys = [], proxies = [];
let currentKeyIndex = 0, currentProxyIndex = 0;

const isEthersV6 = ethers.version.startsWith('6');
const parseUnits = isEthersV6 ? ethers.parseUnits : ethers.utils.parseUnits;
const parseEther = isEthersV6 ? ethers.parseEther : ethers.utils.parseEther;
const formatEther = isEthersV6 ? ethers.formatEther : ethers.utils.formatEther;

const provider = isEthersV6 ? new ethers.JsonRpcProvider(RPC_URL) : new ethers.providers.JsonRpcProvider(RPC_URL);



function loadPrivateKeys() {
  let index = 1;
  let key = process.env[`PRIVATE_KEY_${index}`];
  if (!key && process.env.PRIVATE_KEY) key = process.env.PRIVATE_KEY;

  while (key) {
    if (isValidPrivateKey(key)) privateKeys.push(key);
    else logger.error(`Invalid private key at PRIVATE_KEY_${index}`);
    index++;
    key = process.env[`PRIVATE_KEY_${index}`];
  }

  if (privateKeys.length === 0) {
    logger.critical('No valid private keys found in .env');
    process.exit(1);
  }
  logger.success(`Loaded ${privateKeys.length} private key(s)`);
}

function isValidPrivateKey(key) {
  key = key.trim();
  if (!key.startsWith('0x')) key = '0x' + key;
  try {
    const bytes = Buffer.from(key.replace('0x', ''), 'hex');
    return key.length === 66 && bytes.length === 32;
  } catch {
    return false;
  }
}

function getNextPrivateKey() {
  return privateKeys[currentKeyIndex];
}

function createAxiosInstance() {
  const config = {
    headers: {
      'User-Agent': 'Mozilla/5.0',
      'accept': 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.8',
      'Referer': 'https://storagescan-galileo.0g.ai/'
    }
  };
  const proxy = getNextProxy();
  if (proxy) config.httpsAgent = new HttpsProxyAgent(proxy);
  return axios.create(config);
}

async function fetchRandomImage() {
  try {
    logger.loading('Fetching random image...');
    const axiosInstance = createAxiosInstance();
    const source = IMAGE_SOURCES[Math.floor(Math.random() * IMAGE_SOURCES.length)];
    const response = await axiosInstance.get(source.url, {
      responseType: source.responseType,
      maxRedirects: 5
    });
    logger.success('Image fetched successfully');
    return response.data;
  } catch (error) {
    logger.error(`Error fetching image: ${error.message}`);
    throw error;
  }
}

async function prepareImageData(imageBuffer) {
  const MAX_HASH_ATTEMPTS = 5;
  let attempt = 1;

  while (attempt <= MAX_HASH_ATTEMPTS) {
    try {
      const salt = crypto.randomBytes(16).toString('hex');
      const timestamp = Date.now().toString();
      const hashInput = Buffer.concat([
        Buffer.from(imageBuffer),
        Buffer.from(salt),
        Buffer.from(timestamp)
      ]);
      const hash = '0x' + crypto.createHash('sha256').update(hashInput).digest('hex');
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');
      logger.success(`Generated unique file hash: ${hash}`);
      return {
        root: hash,
        data: imageBase64
      };
    } catch (error) {
      logger.error(`Error generating hash (attempt ${attempt}): ${error.message}`);
      attempt++;
      if (attempt > MAX_HASH_ATTEMPTS) {
        throw new Error(`Failed to generate unique hash after ${MAX_HASH_ATTEMPTS} attempts`);
      }
    }
  }
}



const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function initializeWallet() {
  const privateKey = getNextPrivateKey();
  return new ethers.Wallet(privateKey, provider);
}

async function main() {
  try {
    logger.banner();
    loadPrivateKeys();

    logger.loading('Checking network status...');
    const network = await provider.getNetwork();
    if (BigInt(network.chainId) !== BigInt(CHAIN_ID)) {
      throw new Error(`Invalid chainId: expected ${CHAIN_ID}, got ${network.chainId}`);
    }
    logger.success(`Connected to network: chainId ${network.chainId}`);

    console.log(colors.cyan + "Available wallets:" + colors.reset);
    privateKeys.forEach((key, index) => {
      const wallet = new ethers.Wallet(key);
      console.log(`${colors.green}[${index + 1}]${colors.reset} ${wallet.address}`);
    });
    console.log();

    const cliCount = parseInt(process.argv[2]);
    if (!isNaN(cliCount) && cliCount > 0) {
      logger.info(`CLI arg detected. Using ${cliCount} uploads per wallet`);
      await proceed(cliCount);
    } else {
      rl.question('How many files to upload per wallet? ', async (count) => {
        count = parseInt(count);
        if (isNaN(count) || count <= 0) {
          logger.error('Invalid number. Please enter a number greater than 0.');
          rl.close();
          process.exit(1);
        } else {
          await proceed(count);
        }
      });
    }

    rl.on('close', () => {
      logger.bye('Process completed ~ Bye bang !');
    });

  } catch (error) {
    logger.critical(`Main process error: ${error.message}`);
    rl.close();
    process.exit(1);
  }
}

async function proceed(count) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  let successful = 0;
  let failed = 0;

  for (let walletIndex = 0; walletIndex < privateKeys.length; walletIndex++) {
    currentKeyIndex = walletIndex;
    const wallet = initializeWallet();
    logger.section(\`Processing Wallet #\${walletIndex + 1} [\${wallet.address}]\`);

    for (let i = 1; i <= count; i++) {
      const uploadNumber = (walletIndex * count) + i;
      logger.process(\`Upload \${uploadNumber} (Wallet #\${walletIndex + 1}, File #\${i})\`);

      try {
        const imageBuffer = await fetchRandomImage();
        const imageData = await prepareImageData(imageBuffer);
        // NOTE: implementasi uploadToStorage harus ada di part2 atau import
        await uploadToStorage(imageData, wallet, walletIndex);
        successful++;
        logger.success(\`Upload \${uploadNumber} completed\`);
        await delay(3000);
      } catch (error) {
        failed++;
        logger.error(\`Upload \${uploadNumber} failed: \${error.message}\`);
        await delay(5000);
      }
    }
  }

  logger.section('Upload Summary');
  logger.summary(`Total wallets: ${privateKeys.length}`);
  logger.summary(`Uploads per wallet: ${count}`);
  logger.summary(`Total attempted: ${count * privateKeys.length}`);
  if (successful > 0) logger.success(`Successful: ${successful}`);
  if (failed > 0) logger.error(`Failed: ${failed}`);
  logger.success('All operations completed');
  rl.close();
  process.exit(0);
}

main();
