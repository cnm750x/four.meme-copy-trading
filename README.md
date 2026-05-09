# 钱包交易监控 — four.meme & PancakeSwap

实时监控指定钱包在 **four.meme** 和 **PancakeSwap** 上的所有交易，并通过 Web 页面展示。

## 功能

- 🔴 **实时监控**：通过 BSC WebSocket 节点监听链上事件
- 🐸 **four.meme**：捕获 `TokenPurchase` / `TokenSale` 事件
- 🥞 **PancakeSwap**：捕获 V2 `Swap` 事件，自动识别买入/卖出方向
- 🌐 **前端页面**：WebSocket 实时推送，支持筛选/搜索/统计
- 📋 **历史记录**：保留最近 500 笔交易

## 快速开始

```bash
cd typescript-bot

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入 WS_URL、BSC_RPC_URL、TARGET_WALLETS 等

# 开发模式运行
npm run dev

# 打开浏览器
open http://localhost:3000
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `WS_URL` | BSC WebSocket 节点 | `wss://bsc-rpc.publicnode.com` |
| `BSC_RPC_URL` | BSC HTTP RPC 节点 | `https://bsc-dataseed1.binance.org` |
| `TARGET_WALLETS` | 监控的钱包地址（逗号分隔）| 留空=监控所有 |
| `FOUR_MEME_ADDRESS` | Four.meme 合约地址 | 默认主网地址 |
| `ENABLE_FOURMEME` | 是否监控 four.meme | `true` |
| `ENABLE_PANCAKESWAP` | 是否监控 PancakeSwap | `true` |
| `WEB_PORT` | Web 服务端口 | `3000` |

## 项目结构

```
typescript-bot/
├── src/
│   ├── core/bot.ts              # 核心：HTTP/WebSocket 服务器
│   ├── fourmeme/listener.ts     # Four.meme 事件监听
│   ├── pancakeswap/listener.ts  # PancakeSwap 事件监听
│   ├── types/index.ts           # 类型定义
│   ├── utils/
│   │   ├── config.ts            # 配置加载
│   │   ├── constants.ts         # 合约 ABI 与地址常量
│   │   └── logger.ts            # 日志
│   └── index.ts                 # 入口
└── public/
    └── index.html               # 前端页面
```
