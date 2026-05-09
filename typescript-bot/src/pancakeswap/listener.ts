import { ethers } from 'ethers';
import { Config, TradeEvent } from '../types';
import { logger } from '../utils/logger';
import { PANCAKE_PAIR_ABI, PANCAKE_FACTORY_ABI, ERC20_ABI, WBNB_ADDRESS } from '../utils/constants';
import { randomUUID } from 'crypto';

export function runPancakeSwapListener(
  wsProvider: ethers.WebSocketProvider,
  provider: ethers.JsonRpcProvider,
  config: Config,
  onTrade: (event: TradeEvent) => void
): void {
  logger.info('[PancakeSwap] Setting up Swap event listener...');

  const pairIface = new ethers.Interface(PANCAKE_PAIR_ABI);
  const swapTopic = pairIface.getEvent('Swap')!.topicHash;

  // Listen to ALL Swap events on BSC, then filter by tx.from
  wsProvider.on({ topics: [swapTopic] }, async (log: ethers.Log) => {
    try {
      const tx = await provider.getTransaction(log.transactionHash!);
      if (!tx) return;

      const wallet = tx.from.toLowerCase();

      // If target wallets configured, filter; otherwise monitor all
      if (config.targetWallets.length > 0 && !config.targetWallets.includes(wallet)) {
        return;
      }

      // Decode swap event
      let decoded: ethers.Result;
      try {
        decoded = pairIface.decodeEventLog('Swap', log.data, log.topics);
      } catch {
        return;
      }

      const pairAddress = log.address;

      // Get token0 and token1 from the pair
      let token0 = '';
      let token1 = '';
      try {
        const pair = new ethers.Contract(pairAddress, PANCAKE_PAIR_ABI, provider);
        [token0, token1] = await Promise.all([pair.token0(), pair.token1()]);
      } catch {
        return;
      }

      token0 = token0.toLowerCase();
      token1 = token1.toLowerCase();
      const wbnb = WBNB_ADDRESS.toLowerCase();

      // Determine direction
      const amount0In: bigint = decoded.amount0In;
      const amount1In: bigint = decoded.amount1In;
      const amount0Out: bigint = decoded.amount0Out;
      const amount1Out: bigint = decoded.amount1Out;

      let tokenAddress = '';
      let amountBNB = '0';
      let amountToken = '0';
      let tradeType: 'buy' | 'sell' | 'swap' = 'swap';

      if (token0 === wbnb) {
        // token0=WBNB, token1=token
        tokenAddress = token1;
        if (amount0In > 0n) {
          // spending BNB → buying token
          tradeType = 'buy';
          amountBNB = ethers.formatEther(amount0In);
          amountToken = await formatTokenAmount(provider, token1, amount1Out);
        } else {
          // spending token → getting BNB
          tradeType = 'sell';
          amountToken = await formatTokenAmount(provider, token1, amount1In);
          amountBNB = ethers.formatEther(amount0Out);
        }
      } else if (token1 === wbnb) {
        // token0=token, token1=WBNB
        tokenAddress = token0;
        if (amount1In > 0n) {
          // spending BNB → buying token
          tradeType = 'buy';
          amountBNB = ethers.formatEther(amount1In);
          amountToken = await formatTokenAmount(provider, token0, amount0Out);
        } else {
          // spending token → getting BNB
          tradeType = 'sell';
          amountToken = await formatTokenAmount(provider, token0, amount0In);
          amountBNB = ethers.formatEther(amount1Out);
        }
      } else {
        // token-to-token swap (no BNB involved)
        tokenAddress = token1;
        tradeType = 'swap';
        amountToken = await formatTokenAmount(provider, token1, amount1Out > 0n ? amount1Out : amount0Out);
      }

      const tokenSymbol = tokenAddress
        ? await getTokenSymbol(provider, tokenAddress)
        : '???';

      const event: TradeEvent = {
        id: randomUUID(),
        txHash: log.transactionHash!,
        blockNumber: log.blockNumber,
        timestamp: Date.now(),
        wallet,
        dex: 'pancakeswap',
        type: tradeType,
        tokenAddress: tokenAddress || undefined,
        tokenSymbol,
        amountBNB,
        amountToken,
      };

      logger.info(`[PancakeSwap] ${tradeType.toUpperCase()} | wallet: ${wallet} | token: ${tokenSymbol} | tx: ${log.transactionHash}`);
      onTrade(event);
    } catch (error) {
      logger.error('[PancakeSwap] Error processing log:', error);
    }
  });

  logger.info('[PancakeSwap] Listener started');
}

const symbolCache = new Map<string, string>();
const decimalsCache = new Map<string, number>();

async function getTokenSymbol(provider: ethers.JsonRpcProvider, address: string): Promise<string> {
  if (symbolCache.has(address)) return symbolCache.get(address)!;
  try {
    const contract = new ethers.Contract(address, ERC20_ABI, provider);
    const symbol: string = await contract.symbol();
    symbolCache.set(address, symbol);
    return symbol;
  } catch {
    return address.slice(0, 6) + '…';
  }
}

async function formatTokenAmount(
  provider: ethers.JsonRpcProvider,
  address: string,
  amount: bigint
): Promise<string> {
  if (amount === 0n) return '0';
  let decimals = decimalsCache.get(address);
  if (decimals === undefined) {
    try {
      const contract = new ethers.Contract(address, ERC20_ABI, provider);
      decimals = await contract.decimals();
      decimalsCache.set(address, decimals);
    } catch {
      decimals = 18;
    }
  }
  return ethers.formatUnits(amount, decimals);
}
