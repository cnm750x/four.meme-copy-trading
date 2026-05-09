import { ethers } from 'ethers';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { Config, TradeEvent } from '../types';
import { logger } from '../utils/logger';
import { runFourMemeListener } from '../fourmeme/listener';
import { runPancakeSwapListener } from '../pancakeswap/listener';

const MAX_HISTORY = 500;

export class MonitorBot {
  private config: Config;
  private provider: ethers.JsonRpcProvider;
  private wsProvider: ethers.WebSocketProvider;
  private wss: WebSocketServer;
  private httpServer: http.Server;
  private history: TradeEvent[] = [];

  constructor(config: Config) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.bscRpcUrl);
    this.wsProvider = new ethers.WebSocketProvider(config.wsUrl);

    // HTTP server: serves frontend + WebSocket upgrade
    this.httpServer = http.createServer(this.handleHttp.bind(this));
    this.wss = new WebSocketServer({ server: this.httpServer });
  }

  private handleHttp(req: http.IncomingMessage, res: http.ServerResponse): void {
    const publicDir = path.join(__dirname, '..', '..', 'public');
    let filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url!);

    // Prevent directory traversal
    if (!filePath.startsWith(publicDir)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // API: return history as JSON
    if (req.url === '/api/history') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.history));
      return;
    }

    // API: return config info
    if (req.url === '/api/config') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        targetWallets: this.config.targetWallets,
        enableFourMeme: this.config.enableFourMeme,
        enablePancakeSwap: this.config.enablePancakeSwap,
      }));
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(filePath);
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
      res.end(data);
    });
  }

  private broadcast(event: TradeEvent): void {
    // Store in history
    this.history.unshift(event);
    if (this.history.length > MAX_HISTORY) {
      this.history.pop();
    }

    const msg = JSON.stringify({ type: 'trade', data: event });
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  public async start(): Promise<void> {
    logger.info('='.repeat(60));
    logger.info('Wallet Monitor — four.meme & PancakeSwap');
    logger.info('='.repeat(60));

    if (this.config.targetWallets.length > 0) {
      logger.info(`Monitoring ${this.config.targetWallets.length} wallet(s):`);
      this.config.targetWallets.forEach(w => logger.info(`  ${w}`));
    } else {
      logger.info('No TARGET_WALLETS set — monitoring ALL wallets');
    }

    // Setup blockchain listeners
    if (this.config.enableFourMeme) {
      runFourMemeListener(this.wsProvider, this.provider, this.config, this.broadcast.bind(this));
    }

    if (this.config.enablePancakeSwap) {
      runPancakeSwapListener(this.wsProvider, this.provider, this.config, this.broadcast.bind(this));
    }

    // WebSocket connection handler
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('[WS] Client connected');

      // Send history on connect
      ws.send(JSON.stringify({ type: 'history', data: this.history }));

      ws.on('close', () => logger.info('[WS] Client disconnected'));
    });

    // Start HTTP server
    await new Promise<void>(resolve => {
      this.httpServer.listen(this.config.webPort, () => {
        logger.info(`[Web] Server running at http://localhost:${this.config.webPort}`);
        resolve();
      });
    });
  }

  public async stop(): Promise<void> {
    logger.info('Stopping monitor...');
    await this.wsProvider.destroy();
    this.httpServer.close();
    logger.info('Monitor stopped');
  }
}
