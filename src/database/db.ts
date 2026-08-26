import { Pool } from 'pg';
import { env } from '../config/env';
import { logger } from '../config/logger';

class Database {
  private pool: Pool | null = null;
  private isConnected = false;

  constructor() {
    if (env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: env.DATABASE_URL,
        ssl: env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      });
      this.init();
    } else {
      logger.warn('⚠️ DATABASE_URL not provided. Database persistence will operate in fallback mode.');
    }
  }

  private async init() {
    if (!this.pool) return;
    try {
      const client = await this.pool.connect();
      logger.info('🟢 Connected to PostgreSQL database successfully.');
      client.release();
      this.isConnected = true;
      await this.setupTables();
    } catch (err) {
      logger.error('❌ Failed to connect to PostgreSQL database: ' + (err as Error).message);
      this.isConnected = false;
    }
  }

  private async setupTables() {
    if (!this.pool || !this.isConnected) return;
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        discord_user_id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(255) NOT NULL,
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS guilds (
        discord_guild_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        default_volume INT DEFAULT 80,
        leave_timeout INT DEFAULT 180,
        dj_role_id VARCHAR(64),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS playback_history (
        id SERIAL PRIMARY KEY,
        guild_id VARCHAR(64) NOT NULL,
        track_id VARCHAR(255) NOT NULL,
        title VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        requested_by VARCHAR(64) NOT NULL,
        played_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        track_metadata JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    try {
      await this.pool.query(query);
      logger.info('✅ PostgreSQL tables schema verified/created.');
    } catch (err) {
      logger.error('❌ Failed to create database schema: ' + (err as Error).message);
    }
  }

  public async recordPlayback(guildId: string, trackId: string, title: string, artist: string, requestedBy: string) {
    if (!this.pool || !this.isConnected) return;
    try {
      await this.pool.query(
        'INSERT INTO playback_history (guild_id, track_id, title, artist, requested_by) VALUES ($1, $2, $3, $4, $5)',
        [guildId, trackId, title, artist, requestedBy]
      );
    } catch (err) {
      logger.error(`Failed to record playback history: ${(err as Error).message}`);
    }
  }

  public async getHistory(guildId: string, limit = 10) {
    if (!this.pool || !this.isConnected) return [];
    try {
      const res = await this.pool.query(
        'SELECT title, artist, requested_by, played_at FROM playback_history WHERE guild_id = $1 ORDER BY played_at DESC LIMIT $2',
        [guildId, limit]
      );
      return res.rows;
    } catch (err) {
      logger.error(`Failed to get playback history: ${(err as Error).message}`);
      return [];
    }
  }

  public async addFavorite(userId: string, trackMetadata: object) {
    if (!this.pool || !this.isConnected) return false;
    try {
      await this.pool.query(
        'INSERT INTO favorites (user_id, track_metadata) VALUES ($1, $2)',
        [userId, JSON.stringify(trackMetadata)]
      );
      return true;
    } catch (err) {
      logger.error(`Failed to add favorite: ${(err as Error).message}`);
      return false;
    }
  }

  public async getFavorites(userId: string) {
    if (!this.pool || !this.isConnected) return [];
    try {
      const res = await this.pool.query(
        'SELECT track_metadata, created_at FROM favorites WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
        [userId]
      );
      return res.rows.map((r) => r.track_metadata);
    } catch (err) {
      logger.error(`Failed to get favorites: ${(err as Error).message}`);
      return [];
    }
  }
}

export const db = new Database();
