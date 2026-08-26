import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { Command } from '../Command';
import { db } from '../../database/db';
import { musicManager } from '../../music/MusicManager';

export const favoritesCommand: Command = {
  category: 'user',
  data: new SlashCommandBuilder()
    .setName('favorites')
    .setDescription('Manage your personal favorite tracks')
    .addSubcommand((sub) => sub.setName('add').setDescription('Add currently playing track to your favorites'))
    .addSubcommand((sub) => sub.setName('list').setDescription('List your saved favorite tracks')),
  async execute(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'add') {
      const queue = musicManager.getQueue(interaction.guildId!);
      if (!queue || !queue.currentTrack) {
        await interaction.reply({ content: '❌ Nothing is currently playing.', ephemeral: true });
        return;
      }

      const success = await db.addFavorite(interaction.user.id, queue.currentTrack);
      if (success) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#E74C3C')
              .setDescription(`❤️ Saved **${queue.currentTrack.title}** by *${queue.currentTrack.artist}* to your favorites!`),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [new EmbedBuilder().setColor('#E74C3C').setDescription(`❤️ Saved **${queue.currentTrack.title}** to session favorites.`)],
        });
      }
    } else if (subcommand === 'list') {
      const favs = await db.getFavorites(interaction.user.id);
      if (favs.length === 0) {
        await interaction.reply({ content: '💔 You have no saved favorite tracks yet. Use `/favorites add` while listening!', ephemeral: true });
        return;
      }

      const listStr = favs
        .map((f: any, idx: number) => `**${idx + 1}.** **${f.title}** by *${f.artist}*`)
        .join('\n');

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(`❤️ ${interaction.user.username}'s Favorites`)
            .setDescription(listStr),
        ],
      });
    }
  },
};

export const historyCommand: Command = {
  category: 'user',
  data: new SlashCommandBuilder().setName('history').setDescription('View recently played tracks in this server'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    const localHistory = queue?.previousTracks || [];
    const dbHistory = await db.getHistory(interaction.guildId!, 10);

    const historyItems = dbHistory.length > 0 ? dbHistory : localHistory;

    if (historyItems.length === 0) {
      await interaction.reply({ content: '📜 No recently played tracks recorded for this server yet.', ephemeral: true });
      return;
    }

    const description = historyItems
      .map((item: any, idx: number) => `**${idx + 1}.** **${item.title}** by *${item.artist}*`)
      .join('\n');

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#34495E')
          .setTitle('📜 Server Playback History')
          .setDescription(description),
      ],
    });
  },
};
