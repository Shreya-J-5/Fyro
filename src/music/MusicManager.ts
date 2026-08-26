import { Collection } from 'discord.js';
import { GuildQueue } from './GuildQueue';

export class MusicManager {
  private static instance: MusicManager;
  private queues: Collection<string, GuildQueue> = new Collection();

  private constructor() {}

  public static getInstance(): MusicManager {
    if (!MusicManager.instance) {
      MusicManager.instance = new MusicManager();
    }
    return MusicManager.instance;
  }

  public getOrCreateQueue(guildId: string): GuildQueue {
    let queue = this.queues.get(guildId);
    if (!queue) {
      queue = new GuildQueue(guildId);
      this.queues.set(guildId, queue);
    }
    return queue;
  }

  public getQueue(guildId: string): GuildQueue | undefined {
    return this.queues.get(guildId);
  }

  public deleteQueue(guildId: string): void {
    const queue = this.queues.get(guildId);
    if (queue) {
      queue.destroy();
      this.queues.delete(guildId);
    }
  }
}

export const musicManager = MusicManager.getInstance();
