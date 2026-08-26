import { ActivityType, Client } from 'discord.js';
import { logger } from '../config/logger';

export function handleReady(client: Client): void {
  logger.info(`🚀 Logged in as ${client.user?.tag}!`);
  logger.info(`Vynx Music Bot active across ${client.guilds.cache.size} guild(s).`);

  client.user?.setActivity('/play | Spotify Engine 🎵', { type: ActivityType.Listening });
}
