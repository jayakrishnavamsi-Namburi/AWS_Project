import pino from 'pino';
import { config } from './env.js';

const transport = config.isProd
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname'
      }
    };

export const logger = pino({
  level: config.isProd ? 'info' : 'debug',
  transport
});
