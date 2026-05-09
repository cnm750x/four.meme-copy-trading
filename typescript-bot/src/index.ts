import { loadConfig } from './utils/config';
import { logger } from './utils/logger';
import { MonitorBot } from './core/bot';

async function main() {
  try {
    const config = loadConfig();
    const bot = new MonitorBot(config);
    await bot.start();

    process.on('SIGINT', async () => {
      await bot.stop();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await bot.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
