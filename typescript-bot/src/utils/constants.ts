// PancakeSwap Pair ABI (only Swap event needed)
export const PANCAKE_PAIR_ABI = [
  'event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

// PancakeSwap Factory ABI
export const PANCAKE_FACTORY_ABI = [
  'event PairCreated(address indexed token0, address indexed token1, address pair, uint)',
  'function getPair(address tokenA, address tokenB) external view returns (address pair)',
];

// Four.meme ABI
export const FOUR_MEME_ABI = [
  'event TokenPurchase(address indexed buyer, uint256 ethAmount, uint256 tokensReceived)',
  'event TokenSale(address indexed seller, uint256 tokensSold, uint256 ethReceived)',
];

// ERC20 minimal ABI
export const ERC20_ABI = [
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function name() external view returns (string)',
];

// WBNB address on BNB Chain
export const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

// PancakeSwap V2 Factory
export const PANCAKE_FACTORY_ADDRESS = '0xCA143Ce32Fe78f1f7019d7d551a6402fC5350c73';

// Four.meme default contract address
export const FOUR_MEME_DEFAULT_ADDRESS = '0x5c952063c7fc8610FFDB798152D69F0B9550762b';
