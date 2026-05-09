import { ethers } from 'ethers';
import { Config, TradeEvent } from '../types';
import { logger } from '../utils/logger';
import { FOUR_MEME_ABI, ERC20_ABI } from '../utils/constants';
import { randomUUID } from 'crypto';

export function runFourMemeListener(
  wsProvider: ethers.WebSocketProvider,
  provider: ethers.JsonRpcProvider,
  config: Config,
  onTrade: (event: TradeEvent) => void
): void {
  logger.info(`[Four.meme] Setting up listener on contract: ${config.fourMemeAddress}`);

  const iface = new ethers.Interface(FOUR_MEME_ABI);
  const buyTopic = iface.getEvent('TokenPurchase')!.topicHash;
  const sellTopic = iface.getEvent('TokenSale')!.topicHash;

  const filter = {
    address: config.fourMemeAddress,
    topics: [[buyTopic, sellTopic]],
  };

  wsProvider.on(filter, async (log: ethers.Log) => {
    try {
      const isBuy = log.topics[0] === buyTopic;
      const tx = await provider.getTransaction(log.transactionHash!);
      if (!tx) return;

      const wallet = tx.from.toLowerCase();

      // If target wallets configured, filter; otherwise monitor all
      if (config.targetWallets.length > 0 && !config.targetWallets.includes(wallet)) {
        return;
      }

      let decoded: ethers.Result;
      let amountBNB = '0';
      let amountToken = '0';
      let tokenAddress = '';

      try {
        if (isBuy) {
          decoded = iface.decodeEventLog('TokenPurchase', log.data, log.topics);
          amountBNB = ethers.formatEther(decoded.ethAmount);
          amountToken = ethers.formatUnits(decoded.tokensReceived, 18);
        } else {
          decoded = iface.decodeEventLog('TokenSale', log.data, log.topics);
          amountToken = ethers.formatUnits(decoded.tokensSold, 18);
          amountBNB = ethers.formatEther(decoded.ethReceived);
        }
      } catch {
        // fallback: parse raw tx data
      }

      // Try to get token address from tx data
      try {
        const receipt = await provider.getTransactionReceipt(log.transactionHash!);
        if (receipt) {
          // Look for token transfers in logs
          for (const l of receipt.logs) {
            if (l.address.toLowerCase() !== config.fourMemeAddress.toLowerCase()) {
              tokenAddress = l.address;
              break;
            }
          }
        }
      } catch { /* ignore */ }

      let tokenSymbol = tokenAddress ? await getTokenSymbol(provider, tokenAddress) : 'MEME';

      const event: TradeEvent = {
        id: randomUUID(),
        txHash: log.transactionHash!,
        blockNumber: log.blockNumber,
        timestamp: Date.now(),
        wallet,
        dex: 'fourmeme',
        type: isBuy ? 'buy' : 'sell',
        tokenAddress: tokenAddress || undefined,
        tokenSymbol,
        amountBNB,
        amountToken,
      };

      logger.info(`[Four.meme] ${isBuy ? 'BUY' : 'SELL'} | wallet: ${wallet} | tx: ${log.transactionHash}`);
      onTrade(event);
    } catch (error) {
      logger.error('[Four.meme] Error processing log:', error);
    }
  });

  logger.info('[Four.meme] Listener started');
}

const symbolCache = new Map<string, string>();

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
