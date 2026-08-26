import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../Command';
import { musicManager } from '../../music/MusicManager';

export const pauseCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current track'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || !queue.currentTrack) {
      await interaction.reply({ content: '❌ Nothing is currently playing.', ephemeral: true });
      return;
    }

    if (queue.pause()) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#FF9900').setDescription('⏸️ Playback paused.')],
      });
    } else {
      await interaction.reply({ content: '⚠️ Playback is already paused.', ephemeral: true });
    }
  },
};

export const resumeCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume playback'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || !queue.currentTrack) {
      await interaction.reply({ content: '❌ Nothing is currently playing.', ephemeral: true });
      return;
    }

    if (queue.resume()) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setColor('#1DB954').setDescription('▶️ Playback resumed.')],
      });
    } else {
      await interaction.reply({ content: '⚠️ Playback is already running.', ephemeral: true });
    }
  },
};
