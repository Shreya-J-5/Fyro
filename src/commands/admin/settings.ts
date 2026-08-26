import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { Command } from '../Command';
import { musicManager } from '../../music/MusicManager';

export const settingsCommand: Command = {
  category: 'admin',
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Configure server music bot settings (Admin/DJ required)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Set default playback volume')
        .addIntegerOption((opt) => opt.setName('level').setDescription('Volume 0-100').setRequired(true).setMinValue(0).setMaxValue(100))
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    const volume = interaction.options.getInteger('level', true);

    if (queue) {
      queue.volume = volume;
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#2ECC71')
          .setTitle('⚙️ Server Settings Updated')
          .setDescription(`Default playback volume set to **${volume}%**.`),
      ],
    });
  },
};
