import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder, TextChannel } from 'discord.js';
import { Command } from '../Command';
import { musicManager } from '../../music/MusicManager';
import { AudioResolver } from '../../music/AudioResolver';
import { logger } from '../../config/logger';

export const playCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Search or play a song/playlist from Spotify or YouTube')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Song title, artist name, Spotify link, or YouTube URL')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    // Guard: deferReply first — if it fails, the interaction is stale (hot-reload race), bail immediately
    try {
      await interaction.deferReply();
    } catch (e) {
      logger.warn(`[Play] Ignoring stale interaction (deferReply failed): ${(e as Error).message}`);
      return;
    }

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF3333')
            .setDescription('❌ You must be connected to a voice channel to use `/play`.'),
        ],
      });
      return;
    }

    const query = interaction.options.getString('query', true);
    logger.info(`[Play] Command received. Input: "${query}" | Guild: ${interaction.guildId} | User: ${interaction.user.username}`);

    const queue = musicManager.getOrCreateQueue(interaction.guildId!);

    try {
      if (!queue.voiceConnection) {
        logger.info(`[Play] Connecting to voice channel: ${voiceChannel.id}`);
        await queue.connect(voiceChannel, (interaction.channel as TextChannel) || undefined);
        logger.info(`[Play] Voice connection established`);
      }

      logger.info(`[Play] Resolving input: "${query}"`);
      const tracks = await AudioResolver.resolveInput(query, {
        id: interaction.user.id,
        username: interaction.user.username,
        avatarUrl: interaction.user.displayAvatarURL(),
      });
      logger.info(`[Play] Resolver returned ${tracks.length} track(s)`);

      if (tracks.length === 0) {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFCC00')
              .setDescription(`🔍 No playable audio results found for: \`${query}\``),
          ],
        });
        return;
      }

      queue.addTracks(tracks);

      if (tracks.length === 1) {
        const track = tracks[0];
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#1DB954')
              .setTitle('🎶 Added to Queue')
              .setDescription(`[**${track.title}**](${track.spotifyUrl || track.sourceUrl || ''}) by **${track.artist}**`)
              .setThumbnail(track.thumbnailUrl || null)
              .setFooter({ text: `Requested by ${interaction.user.username}` }),
          ],
        });
      } else {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#1DB954')
              .setTitle('📚 Added Playlist/Album to Queue')
              .setDescription(`Added **${tracks.length} tracks** to the queue!`)
              .setFooter({ text: `Requested by ${interaction.user.username}` }),
          ],
        });
      }
    } catch (err) {
      logger.error(`[Play] Error: ${(err as Error).message}\n${(err as Error).stack}`);
      try {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0000')
              .setDescription(`❌ ${(err as Error).message || 'An unexpected error occurred.'}`),
          ],
        });
      } catch (replyErr) {
        logger.error(`[Play] Could not send error reply: ${(replyErr as Error).message}`);
      }
    }
  },
};
