import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../config/logger';

class CacheService {
  private redis: Redis | null = null;
  private memoryCache: Map<string, { value: string; expiresAt: number }> = new Map();
  private isRedisConnected = false;

  constructor() {
    if (env.REDIS_URL) {
      try {
        this.redis = new Redis(env.REDIS_URL, {
          lazyConnect: true,
          maxRetriesPerRequest: 2,
        });

        this.redis
          .connect()
          .then(() => {
            logger.info('🟢 Connected to Redis cache successfully.');
            this.isRedisConnected = true;
          })
          .catch((err) => {
            logger.warn(`⚠️ Could not connect to Redis (${err.message}). Using in-memory cache fallback.`);
            this.isRedisConnected = false;
          });
      } catch (err) {
        logger.warn(`⚠️ Failed to create Redis client. Using in-memory cache fallback.`);
      }
    } else {
      logger.warn('⚠️ REDIS_URL not provided. Using in-memory cache fallback.');
    }
  }

  public async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.redis) {
      try {
        return await this.redis.get(key);
      } catch (err) {
        logger.error(`Redis GET error for key ${key}: ${(err as Error).message}`);
      }
    }

    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  public async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (err) {
        logger.error(`Redis SET error for key ${key}: ${(err as Error).message}`);
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  public async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (err) {
        logger.error(`Redis DEL error for key ${key}: ${(err as Error).message}`);
      }
    }

    this.memoryCache.delete(key);
  }
}

export const cache = new CacheService();
