import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, SlashCommandBuilder, TextChannel } from 'discord.js';
import { Command } from '../Command';
import { musicManager } from '../../music/MusicManager';
import { LoopMode } from '../../music/GuildQueue';

export const shuffleCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('shuffle').setDescription('Shuffle the upcoming tracks in the queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || queue.queue.length === 0) {
      await interaction.reply({ content: '❌ Not enough tracks in queue to shuffle.', ephemeral: true });
      return;
    }

    queue.shuffle();
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor('#1DB954').setDescription('🔀 Queue has been randomly shuffled!')],
    });
  },
};

export const loopCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Set loop mode (off, track, queue)')
    .addStringOption((opt) =>
      opt
        .setName('mode')
        .setDescription('Loop mode')
        .setRequired(true)
        .addChoices(
          { name: 'Off', value: LoopMode.OFF },
          { name: 'Track', value: LoopMode.TRACK },
          { name: 'Queue', value: LoopMode.QUEUE }
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue) {
      await interaction.reply({ content: '❌ Bot is not active in a voice channel.', ephemeral: true });
      return;
    }

    const mode = interaction.options.getString('mode', true) as LoopMode;
    queue.setLoopMode(mode);

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor('#1DB954').setDescription(`🔁 Loop mode updated to **${mode}**`)],
    });
  },
};

export const removeCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a track from queue by position number')
    .addIntegerOption((opt) => opt.setName('position').setDescription('Position number in queue').setRequired(true).setMinValue(1)),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || queue.queue.length === 0) {
      await interaction.reply({ content: '❌ Queue is empty.', ephemeral: true });
      return;
    }

    const position = interaction.options.getInteger('position', true);
    const removed = queue.removeTrack(position - 1);

    if (!removed) {
      await interaction.reply({ content: '❌ Invalid queue position number.', ephemeral: true });
      return;
    }

    await interaction.reply({
      embeds: [new EmbedBuilder().setColor('#FF9900').setDescription(`🗑️ Removed **${removed.title}** from position ${position}.`)],
    });
  },
};

export const clearCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('clear').setDescription('Clear all upcoming tracks from queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || queue.queue.length === 0) {
      await interaction.reply({ content: '❌ Queue is already empty.', ephemeral: true });
      return;
    }

    queue.clearQueue();
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor('#FF3333').setDescription('🧹 Cleared all tracks from queue.')],
    });
  },
};

export const clearQueueCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('clear-queue').setDescription('Clear all tracks from the queue'),
  async execute(interaction: ChatInputCommandInteraction) {
    await clearCommand.execute(interaction);
  },
};

export const joinCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('join').setDescription('Connect Vynx to your current voice channel'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const member = interaction.member as GuildMember;
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      await interaction.editReply({ content: '❌ You must be connected to a voice channel.' });
      return;
    }

    if (!voiceChannel.joinable) {
      await interaction.editReply({
        content: `❌ Cannot join **${voiceChannel.name}**. Please check that the bot has Connect & Speak permissions and the channel is not full.`,
      });
      return;
    }

    const queue = musicManager.getOrCreateQueue(interaction.guildId!);
    await queue.connect(voiceChannel, (interaction.channel as TextChannel) || undefined);

    await interaction.editReply({
      embeds: [new EmbedBuilder().setColor('#1DB954').setDescription(`🔊 Joined **${voiceChannel.name}**`)],
    });
  },
};

export const leaveCommand: Command = {
  category: 'music',
  data: new SlashCommandBuilder().setName('leave').setDescription('Disconnect Vynx from the voice channel'),
  async execute(interaction: ChatInputCommandInteraction) {
    const queue = musicManager.getQueue(interaction.guildId!);
    if (!queue || !queue.voiceConnection) {
      await interaction.reply({ content: '❌ Bot is not connected to a voice channel.', ephemeral: true });
      return;
    }

    musicManager.deleteQueue(interaction.guildId!);
    await interaction.reply({
      embeds: [new EmbedBuilder().setColor('#FF3333').setDescription('👋 Disconnected from voice channel.')],
    });
  },
};
