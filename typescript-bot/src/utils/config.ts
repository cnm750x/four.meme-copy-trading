import dotenv from 'dotenv';
import { Config } from '../types';
import { FOUR_MEME_DEFAULT_ADDRESS, PANCAKE_FACTORY_ADDRESS } from './constants';

dotenv.config();

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

export function loadConfig(): Config {
  const targetWalletsRaw = getEnv('TARGET_WALLETS', '');
  const targetWallets = targetWalletsRaw
    ? targetWalletsRaw.split(',').map(w => w.trim().toLowerCase()).filter(Boolean)
    : [];

  return {
    wsUrl: getEnv('WS_URL', 'wss://bsc-rpc.publicnode.com'),
    bscRpcUrl: getEnv('BSC_RPC_URL', 'https://bsc-dataseed1.binance.org'),
    targetWallets,
    fourMemeAddress: getEnv('FOUR_MEME_ADDRESS', FOUR_MEME_DEFAULT_ADDRESS),
    pancakeSwapFactoryAddr: getEnv('PANCAKE_SWAP_FACTORY_ADDR', PANCAKE_FACTORY_ADDRESS),
    enablePancakeSwap: (getEnv('ENABLE_PANCAKESWAP', 'true')) === 'true',
    enableFourMeme: (getEnv('ENABLE_FOURMEME', 'true')) === 'true',
    webPort: parseInt(getEnv('WEB_PORT', '3000'), 10),
  };
}
