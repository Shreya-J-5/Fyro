import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { Command } from '../Command';

export const pingCommand: Command = {
  category: 'utility',
  data: new SlashCommandBuilder().setName('ping').setDescription('Check Vynx bot latency and status'),
  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ content: '🏓 Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);

    await interaction.editReply({
      content: '',
      embeds: [
        new EmbedBuilder()
          .setColor('#1DB954')
          .setTitle('🏓 Pong! Vynx Status')
          .addFields(
            { name: 'Roundtrip Latency', value: `${latency}ms`, inline: true },
            { name: 'WebSocket Latency', value: `${apiLatency}ms`, inline: true }
          ),
      ],
    });
  },
};

export const statsCommand: Command = {
  category: 'utility',
  data: new SlashCommandBuilder().setName('stats').setDescription('Display Vynx bot usage statistics'),
  async execute(interaction: ChatInputCommandInteraction) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const embed = new EmbedBuilder()
      .setColor('#1DB954')
      .setTitle('📊 Vynx System & Cluster Statistics')
      .setThumbnail(interaction.client.user?.displayAvatarURL() || null)
      .addFields(
        { name: 'Active Guilds', value: `${interaction.client.guilds.cache.size}`, inline: true },
        { name: 'System Uptime', value: `${hours}h ${minutes}m`, inline: true },
        { name: 'Node Version', value: `${process.version}`, inline: true },
        { name: 'Memory Usage', value: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  },
};

export const helpCommand: Command = {
  category: 'utility',
  data: new SlashCommandBuilder().setName('help').setDescription('Interactive guide to Vynx commands and features'),
  async execute(interaction: ChatInputCommandInteraction) {
    const categoriesEmbed = new EmbedBuilder()
      .setColor('#1DB954')
      .setTitle('🎵 Vynx Music Bot — Interactive Help Menu')
      .setDescription(
        'Welcome to **Vynx**! Select a command category from the menu below to view available commands, examples, and options.'
      )
      .addFields(
        { name: '🎶 Music Core', value: '`/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`' },
        { name: '✨ Discovery', value: '`/vibe`, `/radio`, `/search`' },
        { name: '🎛️ Playback Control', value: '`/shuffle`, `/loop`, `/volume`, `/remove`, `/clear`, `/join`, `/leave`' },
        { name: '❤️ User & History', value: '`/favorites`, `/history`' },
        { name: '⚙️ Admin & Utility', value: '`/settings`, `/ping`, `/stats`' }
      )
      .setFooter({ text: 'Select a category below to explore!' });

    const menu = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('Choose a command category...')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('Core Music Commands').setValue('cat_music').setEmoji('🎶'),
        new StringSelectMenuOptionBuilder().setLabel('Discovery & Radio').setValue('cat_discovery').setEmoji('✨'),
        new StringSelectMenuOptionBuilder().setLabel('Controls & Queue').setValue('cat_controls').setEmoji('🎛️'),
        new StringSelectMenuOptionBuilder().setLabel('User & Favorites').setValue('cat_user').setEmoji('❤️'),
        new StringSelectMenuOptionBuilder().setLabel('Admin & System').setValue('cat_admin').setEmoji('⚙️')
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

    const msg = await interaction.reply({
      embeds: [categoriesEmbed],
      components: [row],
      fetchReply: true,
    });

    const collector = msg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '❌ Use `/help` yourself to browse!', ephemeral: true });
        return;
      }

      const category = i.values[0];
      const catEmbed = new EmbedBuilder().setColor('#1DB954');

      if (category === 'cat_music') {
        catEmbed.setTitle('🎶 Core Music Commands').addFields(
          { name: '/play <query>', value: 'Play or queue a track, album, Spotify link, or YouTube URL.' },
          { name: '/pause & /resume', value: 'Pause or resume the current playing track.' },
          { name: '/skip', value: 'Skip to the next song in the queue.' },
          { name: '/stop', value: 'Stop music playback and clear the guild queue.' },
          { name: '/queue', value: 'Display the upcoming queued tracks.' },
          { name: '/nowplaying', value: 'Show the interactive Now Playing embed.' }
        );
      } else if (category === 'cat_discovery') {
        catEmbed.setTitle('✨ Discovery & Radio Commands').addFields(
          { name: '/vibe <mood>', value: 'Queue a mood-based playlist (Chill, Workout, Party, Focus, Sleep, Gaming).' },
          { name: '/radio <artist/genre>', value: 'Start continuous audio discovery around an artist or genre.' },
          { name: '/search <query>', value: 'Search Spotify/YouTube and select from the top 5 results.' }
        );
      } else if (category === 'cat_controls') {
        catEmbed.setTitle('🎛️ Playback Control Commands').addFields(
          { name: '/shuffle', value: 'Randomize the queued tracks.' },
          { name: '/loop <off|track|queue>', value: 'Toggle single track or full queue repeat.' },
          { name: '/remove <position>', value: 'Remove a track at specific queue index.' },
          { name: '/clear', value: 'Wipe all upcoming tracks from queue.' },
          { name: '/join & /leave', value: 'Manually manage bot voice channel connection.' }
        );
      } else if (category === 'cat_user') {
        catEmbed.setTitle('❤️ User & History Commands').addFields(
          { name: '/favorites add', value: 'Save the currently playing song to your personal favorites.' },
          { name: '/favorites list', value: 'View your saved favorite tracks.' },
          { name: '/history', value: 'View recently played songs in this server.' }
        );
      } else if (category === 'cat_admin') {
        catEmbed.setTitle('⚙️ Admin & Utility Commands').addFields(
          { name: '/settings volume <0-100>', value: 'Adjust default server playback volume.' },
          { name: '/ping', value: 'Check bot API latency.' },
          { name: '/stats', value: 'Check bot memory usage and uptime.' }
        );
      }

      await i.update({ embeds: [catEmbed], components: [row] });
    });
  },
};
