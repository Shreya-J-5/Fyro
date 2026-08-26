import {
  ActionRowBuilder,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  GuildMember,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextChannel,
} from 'discord.js';
import { Command } from '../Command';
import { musicManager } from '../../music/MusicManager';
import { AudioResolver } from '../../music/AudioResolver';
import { spotifyService } from '../../spotify/spotifyClient';
import { logger } from '../../config/logger';

const moodKeywords: Record<string, string[]> = {
  chill: ['lofi chill beats', 'acoustic chill', 'ambient relaxing music'],
  workout: ['workout motivation EDM', 'gym hype hip hop', 'high energy bass rock'],
  party: ['top party pop hits', 'dance festival club mix', 'reggaeton party'],
  focus: ['deep focus study music', 'classical focus piano', 'instrumental synthwave'],
  sleep: ['sleep rain soundscape', 'deep sleep ambient', 'soft piano lullaby'],
  gaming: ['synthwave gaming mix', 'epic orchestral gaming', 'cyberpunk electro'],
};

export const vibeCommand: Command = {
  category: 'discovery',
  data: new SlashCommandBuilder()
    .setName('vibe')
    .setDescription('Set the server mood with an instant curated music stream')
    .addStringOption((opt) =>
      opt
        .setName('mood')
        .setDescription('Select your vibe')
        .setRequired(true)
        .addChoices(
          { name: 'Chill ☕', value: 'chill' },
          { name: 'Workout 🏋️', value: 'workout' },
          { name: 'Party 🎉', value: 'party' },
          { name: 'Focus 🧠', value: 'focus' },
          { name: 'Sleep 🌙', value: 'sleep' },
          { name: 'Gaming 🎮', value: 'gaming' }
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.editReply('❌ You must join a voice channel first!');
      return;
    }

    const mood = interaction.options.getString('mood', true);
    const options = moodKeywords[mood] || moodKeywords.chill;
    const randomQuery = options[Math.floor(Math.random() * options.length)];

    const queue = musicManager.getOrCreateQueue(interaction.guildId!);
    if (!queue.voiceConnection) {
      await queue.connect(voiceChannel, (interaction.channel as TextChannel) || undefined);
    }

    const tracks = await AudioResolver.resolveInput(randomQuery, {
      id: interaction.user.id,
      username: interaction.user.username,
    });

    if (tracks.length === 0) {
      await interaction.editReply(`❌ Could not generate vibe for: **${mood}**`);
      return;
    }

    queue.addTracks(tracks);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#9B59B6')
          .setTitle(`✨ Vibe Activated: ${mood.toUpperCase()}`)
          .setDescription(`Now cueing up: **${tracks[0].title}** by *${tracks[0].artist}*`)
          .setFooter({ text: `Requested by ${interaction.user.username}` }),
      ],
    });
  },
};

export const radioCommand: Command = {
  category: 'discovery',
  data: new SlashCommandBuilder()
    .setName('radio')
    .setDescription('Start continuous artist or genre radio discovery')
    .addStringOption((opt) => opt.setName('target').setDescription('Artist name or genre (e.g. Drake, Synthwave)').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.editReply('❌ You must join a voice channel first!');
      return;
    }

    const target = interaction.options.getString('target', true);
    const query = `${target} radio mix top tracks`;

    const queue = musicManager.getOrCreateQueue(interaction.guildId!);
    if (!queue.voiceConnection) {
      await queue.connect(voiceChannel, (interaction.channel as TextChannel) || undefined);
    }

    const tracks = await AudioResolver.resolveInput(query, {
      id: interaction.user.id,
      username: interaction.user.username,
    });

    if (tracks.length === 0) {
      await interaction.editReply(`❌ Could not launch radio station for **${target}**`);
      return;
    }

    queue.addTracks(tracks);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#1ABC9C')
          .setTitle(`📻 Radio Station Started: ${target}`)
          .setDescription(`Playing continuous track discovery based on **${target}**.`)
          .setThumbnail(tracks[0].thumbnailUrl || null),
      ],
    });
  },
};

export const searchCommand: Command = {
  category: 'discovery',
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search Spotify/YouTube and pick from top 5 matches')
    .addStringOption((opt) => opt.setName('query').setDescription('Track title or artist').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();
    const query = interaction.options.getString('query', true);

    let results = await spotifyService.searchTracks(query, 5);
    if (results.length === 0) {
      const ytTracks = await AudioResolver.resolveSearchQuery(query, {
        id: interaction.user.id,
        username: interaction.user.username,
      });
      if (ytTracks.length === 0) {
        await interaction.editReply(`❌ No search results found for \`${query}\`.`);
        return;
      }
      results = ytTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        album: 'YouTube Single',
        durationMs: t.durationMs,
        thumbnailUrl: t.thumbnailUrl,
        spotifyUrl: t.sourceUrl || '',
      }));
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('search_select')
      .setPlaceholder('Select a song to add to queue...')
      .addOptions(
        results.slice(0, 5).map((track, idx) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(`${idx + 1}. ${track.title.slice(0, 80)}`)
            .setDescription(`By ${track.artist.slice(0, 90)}`)
            .setValue(track.title + ' ' + track.artist)
        )
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    const replyMsg = await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor('#3498DB')
          .setTitle(`🔍 Search Results for: "${query}"`)
          .setDescription(
            results
              .map((t, idx) => `**${idx + 1}.** **${t.title}** by *${t.artist}* (${Math.floor(t.durationMs / 60000)}m)`)
              .join('\n')
          ),
      ],
      components: [row],
    });

    const collector = replyMsg.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 30_000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: '❌ Only the command user can select this track.', ephemeral: true });
        return;
      }

      await i.deferUpdate();
      const selectedQuery = i.values[0];

      const member = interaction.member as GuildMember;
      if (!member?.voice?.channel) {
        await i.followUp({ content: '❌ Please join a voice channel first!', ephemeral: true });
        return;
      }

      const queue = musicManager.getOrCreateQueue(interaction.guildId!);
      if (!queue.voiceConnection) {
        await queue.connect(member.voice.channel, (interaction.channel as TextChannel) || undefined);
      }

      const selectedTracks = await AudioResolver.resolveInput(selectedQuery, {
        id: interaction.user.id,
        username: interaction.user.username,
      });

      if (selectedTracks.length > 0) {
        queue.addTracks(selectedTracks);
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#1DB954')
              .setDescription(`✅ Added **${selectedTracks[0].title}** by *${selectedTracks[0].artist}* to the queue!`),
          ],
          components: [],
        });
      }
    });
  },
};
