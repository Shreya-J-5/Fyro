import { Interaction } from 'discord.js';
import { commandsCollection } from '../commands';
import { musicManager } from '../music/MusicManager';
import { LoopMode } from '../music/GuildQueue';
import { logger } from '../config/logger';

export async function handleInteraction(interaction: Interaction): Promise<void> {
  // 1. Slash Command Interactions
  if (interaction.isChatInputCommand()) {
    const command = commandsCollection.get(interaction.commandName);
    if (!command) {
      logger.warn(`No matching command found for /${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`Error executing /${interaction.commandName}: ${(err as Error).message}`);
      const replyOptions = {
        content: '❌ An unexpected error occurred while executing this command.',
        ephemeral: true,
      };
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(replyOptions);
        } else {
          await interaction.reply(replyOptions);
        }
      } catch (replyErr) {
        logger.debug(`Could not send error response to Discord interaction: ${(replyErr as Error).message}`);
      }
    }
    return;
  }

  // 2. Button Component Interactions (Now Playing embed controls)
  if (interaction.isButton()) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({ content: '❌ No active music session in this server.', ephemeral: true });
      return;
    }

    const safeReply = async (content: string) => {
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content, ephemeral: true });
        } else {
          await interaction.reply({ content, ephemeral: true });
        }
      } catch (err) {
        logger.debug(`Could not send button response: ${(err as Error).message}`);
      }
    };

    const customId = interaction.customId;

    if (customId === 'btn_playpause') {
      if (queue.player.state.status === 'playing') {
        queue.pause();
        await safeReply('⏸️ Playback paused.');
      } else {
        queue.resume();
        await safeReply('▶️ Playback resumed.');
      }
    } else if (customId === 'btn_skip') {
      queue.skip();
      await safeReply('⏭️ Track skipped.');
    } else if (customId === 'btn_shuffle') {
      queue.shuffle();
      await safeReply('🔀 Queue shuffled.');
    } else if (customId === 'btn_loop') {
      const nextMode =
        queue.loopMode === LoopMode.OFF
          ? LoopMode.TRACK
          : queue.loopMode === LoopMode.TRACK
          ? LoopMode.QUEUE
          : LoopMode.OFF;
      queue.setLoopMode(nextMode);
      await safeReply(`🔁 Loop mode changed to **${nextMode}**.`);
    } else if (customId === 'btn_prev') {
      if (queue.previousTracks.length === 0) {
        await safeReply('❌ No previous tracks available.');
        return;
      }
      const prevTrack = queue.previousTracks.pop()!;
      queue.queue.unshift(prevTrack);
      queue.skip();
      await safeReply(`⏮️ Playing previous track: **${prevTrack.title}**`);
    }
  }
}
