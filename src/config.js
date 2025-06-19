const { ethers } = require('ethers');
const ora = require('ora');
const figlet = require('figlet');
const gradient = require('gradient-string');
const chalk = require('chalk');

// ====== Color Map for CLI Output ======
const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  bold: "\x1b[1m"
};

// ====== Spinner & Logger Handler ======
let activeSpinner = null;

const logger = {
  info: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.green}[✓] ${msg}${colors.reset}`); },
  warn: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`); },
  error: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.red}[✗] ${msg}${colors.reset}`); },
  success: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.green}[✅] ${msg}${colors.reset}`); },
  process: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`\n${colors.white}[➤] ${msg}${colors.reset}`); },
  debug: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.gray}[…] ${msg}${colors.reset}`); },
  bye: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.yellow}[…] ${msg}${colors.reset}`); },
  critical: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.red}${colors.bold}[❌] ${msg}${colors.reset}`); },
  summary: (msg) => { if (activeSpinner) activeSpinner.stop(); console.log(`${colors.white}[✓] ${msg}${colors.reset}`); },
  section: (msg) => {
    if (activeSpinner) activeSpinner.stop();
    const line = '='.repeat(50);
    console.log(`\n${colors.cyan}${line}${colors.reset}`);
    if (msg) console.log(`${colors.cyan}${msg}${colors.reset}`);
    console.log(`${colors.cyan}${line}${colors.reset}\n`);
  },
  loading: (msg) => { if (activeSpinner) activeSpinner.stop(); activeSpinner = ora(msg).start(); },
  done: (msg) => { if (activeSpinner) activeSpinner.succeed(msg); activeSpinner = null; },
  fail: (msg) => { if (activeSpinner) activeSpinner.fail(msg); activeSpinner = null; },
  stop: () => { if (activeSpinner) activeSpinner.stop(); activeSpinner = null; },
  
  banner: () => {
    if (activeSpinner) activeSpinner.stop();
    console.clear();

    const ascii = figlet.textSync("0G", {
      font: "ANSI Shadow",
      horizontalLayout: "default",
      verticalLayout: "default"
    });

    console.log(gradient.pastel.multiline(ascii));
    console.log(chalk.white.bold('               UPLOAD TOOL'));
    console.log(chalk.gray.bold('        build by : t.me/didinska\n'));
  }
};

// ====== Constants & Config ======
const CHAIN_ID = 16601;
const RPC_URL = 'https://evmrpc-testnet.0g.ai';
const CONTRACT_ADDRESS = '0x5f1d96895e442fc0168fa2f9fb1ebef93cb5035e';
const METHOD_ID = '0xef3e12dc';
const PROXY_FILE = 'proxies.txt';
const INDEXER_URL = 'https://indexer-storage-testnet-turbo.0g.ai';
const EXPLORER_URL = 'https://chainscan-galileo.0g.ai/tx/';

const IMAGE_SOURCES = [
  { url: 'https://picsum.photos/800/600', responseType: 'arraybuffer' },
  { url: 'https://loremflickr.com/800/600', responseType: 'arraybuffer' }
];

// ====== Ethers Compatibility ======
const isEthersV6 = ethers.version.startsWith('6');
const parseUnits = isEthersV6 ? ethers.parseUnits : ethers.utils.parseUnits;
const parseEther = isEthersV6 ? ethers.parseEther : ethers.utils.parseEther;
const formatEther = isEthersV6 ? ethers.formatEther : ethers.utils.formatEther;

// ====== Utility ======
const delay = (ms) => new Promise(res => setTimeout(res, ms));

// ====== Exported ======
module.exports = {
  logger,
  CHAIN_ID,
  RPC_URL,
  CONTRACT_ADDRESS,
  METHOD_ID,
  PROXY_FILE,
  INDEXER_URL,
  EXPLORER_URL,
  IMAGE_SOURCES,
  parseUnits,
  parseEther,
  formatEther,
  delay
};
