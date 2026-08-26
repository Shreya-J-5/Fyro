import winston from 'winston';
import { env } from './env';

const maskSecrets = winston.format((info) => {
  let message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);
  
  if (env.DISCORD_TOKEN) {
    message = message.replace(new RegExp(env.DISCORD_TOKEN, 'g'), '[REDACTED_DISCORD_TOKEN]');
  }
  if (env.SPOTIFY_CLIENT_SECRET) {
    message = message.replace(new RegExp(env.SPOTIFY_CLIENT_SECRET, 'g'), '[REDACTED_SPOTIFY_SECRET]');
  }
  
  info.message = message;
  return info;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    maskSecrets(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `[${timestamp}] [${level}]: ${message}`;
        })
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});
