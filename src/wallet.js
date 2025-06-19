// src/wallet.js
require('dotenv').config();
const fs = require('fs');
const { ethers } = require('ethers');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { logger, PROXY_FILE, RPC_URL } = require('./config');

let privateKeys = [];
let proxies = [];
let currentKeyIndex = 0;
let currentProxyIndex = 0;

const provider = ethers.version.startsWith('6')
  ? new ethers.JsonRpcProvider(RPC_URL)
  : new ethers.providers.JsonRpcProvider(RPC_URL);

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

function loadPrivateKeys() {
  try {
    let index = 1;
    let key = process.env[`PRIVATE_KEY_${index}`];

    if (!key && index === 1 && process.env.PRIVATE_KEY) {
      key = process.env.PRIVATE_KEY;
    }

    while (key) {
      if (isValidPrivateKey(key)) {
        privateKeys.push(key);
      } else {
        logger.error(`Invalid private key at PRIVATE_KEY_${index}`);
      }
      index++;
      key = process.env[`PRIVATE_KEY_${index}`];
    }

    if (privateKeys.length === 0) {
      logger.critical('No valid private keys found in .env file');
      process.exit(1);
    }

    logger.success(`Loaded ${privateKeys.length} private key(s)`);
  } catch (error) {
    logger.critical(`Failed to load private keys: ${error.message}`);
    process.exit(1);
  }
}

function loadProxies() {
  try {
    if (fs.existsSync(PROXY_FILE)) {
      const data = fs.readFileSync(PROXY_FILE, 'utf8');
      proxies = data.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      if (proxies.length > 0) {
        logger.info(`Loaded ${proxies.length} proxies from ${PROXY_FILE}`);
      } else {
        logger.warn(`No proxies found in ${PROXY_FILE}`);
      }
    } else {
      logger.warn(`Proxy file ${PROXY_FILE} not found`);
    }
  } catch (error) {
    logger.error(`Failed to load proxies: ${error.message}`);
  }
}

function extractProxyIP(proxy) {
  try {
    let cleanProxy = proxy.replace(/^https?:\/\//, '').replace(/.*@/, '');
    const ip = cleanProxy.split(':')[0];
    return ip || cleanProxy;
  } catch (error) {
    return proxy;
  }
}

function getNextProxy() {
  if (proxies.length === 0) return null;
  const proxy = proxies[currentProxyIndex];
  currentProxyIndex = (currentProxyIndex + 1) % proxies.length;
  return proxy;
}

function getNextPrivateKey() {
  return privateKeys[currentKeyIndex];
}

function rotatePrivateKey() {
  currentKeyIndex = (currentKeyIndex + 1) % privateKeys.length;
  return privateKeys[currentKeyIndex];
}

function createAxiosInstance(userAgent = null) {
  const headers = {
    'User-Agent': userAgent || 'Mozilla/5.0',
    'accept': 'application/json, text/plain, */*'
  };

  const proxy = getNextProxy();
  const config = { headers };
  if (proxy) {
    logger.debug(`Using proxy IP: ${extractProxyIP(proxy)}`);
    config.httpsAgent = new HttpsProxyAgent(proxy);
  }

  return require('axios').create(config);
}

function initializeWallet() {
  const privateKey = getNextPrivateKey();
  return new ethers.Wallet(privateKey, provider);
}

module.exports = {
  provider,
  loadPrivateKeys,
  loadProxies,
  getNextPrivateKey,
  rotatePrivateKey,
  initializeWallet,
  createAxiosInstance,
  extractProxyIP,
  privateKeys
};
