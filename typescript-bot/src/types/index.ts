export interface Config {
  wsUrl: string;
  bscRpcUrl: string;
  targetWallets: string[];
  fourMemeAddress: string;
  pancakeSwapFactoryAddr: string;
  enablePancakeSwap: boolean;
  enableFourMeme: boolean;
  webPort: number;
}

export interface TradeEvent {
  id: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  wallet: string;
  dex: 'fourmeme' | 'pancakeswap';
  type: 'buy' | 'sell' | 'swap';
  tokenAddress?: string;
  tokenSymbol?: string;
  amountBNB?: string;
  amountToken?: string;
  valueUSD?: string;
}
