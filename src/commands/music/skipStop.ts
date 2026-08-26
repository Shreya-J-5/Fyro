import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../Command';
import { musicManager } from '../../music/MusicManager';

export const skipCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the currently playing track'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || !queue.currentTrack) {
      await interaction.reply({ content: '❌ Nothing is currently playing.', ephemeral: true });
      return;
    }

    const skippedTrack = queue.currentTrack;
    queue.skip();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#1DB954')
          .setDescription(`⏭️ Skipped **${skippedTrack.title}**`),
      ],
    });
  },
};

export const stopCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('stop').setDescription('Stop playback and clear the queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({ content: '❌ Bot is not active in voice channel.', ephemeral: true });
      return;
    }

    queue.stop();

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#FF3333')
          .setDescription('⏹️ Stopped playback and cleared the queue.'),
      ],
    });
  },
};
