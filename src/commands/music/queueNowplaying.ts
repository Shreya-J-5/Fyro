import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../Command';
import { musicManager } from '../../music/MusicManager';
import { formatDuration } from '../../music/Track';

export const queueCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('queue').setDescription('View the current music queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || (!queue.currentTrack && queue.queue.length === 0)) {
      const content = '📜 Queue is currently empty.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
      return;
    }

    const current = queue.currentTrack;
    const items = queue.queue.slice(0, 10).map((t, idx) => {
      return `**${idx + 1}.** [${t.title}](${t.spotifyUrl || t.sourceUrl || ''}) — *${t.artist}* (${formatDuration(t.durationMs)})`;
    });

    const embed = new EmbedBuilder()
      .setColor('#1DB954')
      .setTitle(`🎵 Guild Music Queue (${queue.queue.length + (current ? 1 : 0)} tracks)`)
      .setDescription(
        `**Currently Playing:**\n${
          current
            ? `▶️ [**${current.title}**](${current.spotifyUrl || current.sourceUrl || ''}) — *${current.artist}* (${formatDuration(current.durationMs)})`
            : 'None'
        }\n\n` +
          `**Up Next:**\n${items.length > 0 ? items.join('\n') : 'No upcoming tracks in queue.'}` +
          (queue.queue.length > 10 ? `\n\n*...and ${queue.queue.length - 10} more tracks.*` : '')
      )
      .setFooter({ text: `Loop Mode: ${queue.loopMode} | Shuffled: ${queue.isShuffled ? 'Yes' : 'No'}` });

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [embed] });
    }
  },
};

export const nowplayingCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('nowplaying').setDescription('Display details of the current playing track'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || !queue.currentTrack) {
      const content = '❌ Nothing is currently playing.';
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content });
      } else {
        await interaction.reply({ content, ephemeral: true });
      }
      return;
    }

    await queue.sendNowPlayingEmbed(queue.currentTrack);
    const content = '📊 Displaying Now Playing panel.';
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content });
    } else {
      await interaction.reply({ content, ephemeral: true });
    }
  },
};

export const viewQueueCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('view-queue').setDescription('View all tracks currently in the music queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    await queueCommand.execute(interaction);
  },
};
