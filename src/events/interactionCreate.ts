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

    const customId = interaction.customId;

    if (customId === 'btn_playpause') {
      if (queue.player.state.status === 'playing') {
        queue.pause();
        await interaction.reply({ content: '⏸️ Playback paused.', ephemeral: true });
      } else {
        queue.resume();
        await interaction.reply({ content: '▶️ Playback resumed.', ephemeral: true });
      }
    } else if (customId === 'btn_skip') {
      queue.skip();
      await interaction.reply({ content: '⏭️ Track skipped.', ephemeral: true });
    } else if (customId === 'btn_shuffle') {
      queue.shuffle();
      await interaction.reply({ content: '🔀 Queue shuffled.', ephemeral: true });
    } else if (customId === 'btn_loop') {
      const nextMode =
        queue.loopMode === LoopMode.OFF
          ? LoopMode.TRACK
          : queue.loopMode === LoopMode.TRACK
          ? LoopMode.QUEUE
          : LoopMode.OFF;
      queue.setLoopMode(nextMode);
      await interaction.reply({ content: `🔁 Loop mode changed to **${nextMode}**.`, ephemeral: true });
    } else if (customId === 'btn_prev') {
      if (queue.previousTracks.length === 0) {
        await interaction.reply({ content: '❌ No previous tracks available.', ephemeral: true });
        return;
      }
      const prevTrack = queue.previousTracks.pop()!;
      queue.queue.unshift(prevTrack);
      queue.skip();
      await interaction.reply({ content: `⏮️ Playing previous track: **${prevTrack.title}**`, ephemeral: true });
    }
  }
}
