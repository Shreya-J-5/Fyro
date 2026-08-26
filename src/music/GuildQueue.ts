import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  entersState,
  getVoiceConnection,
  joinVoiceChannel,
  VoiceConnection,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  Message,
  TextChannel,
  VoiceBasedChannel,
} from 'discord.js';
import { AudioResolver } from './AudioResolver';
import { formatDuration, TrackMetadata } from './Track';
import { env } from '../config/env';
import { logger } from '../config/logger';

export enum LoopMode {
  OFF = 'OFF',
  TRACK = 'TRACK',
  QUEUE = 'QUEUE',
}

export class GuildQueue {
  public readonly guildId: string;
  public voiceConnection: VoiceConnection | null = null;
  public player: AudioPlayer;
  public queue: TrackMetadata[] = [];
  public currentTrack: TrackMetadata | null = null;
  public previousTracks: TrackMetadata[] = [];
  
  public volume = env.DEFAULT_VOLUME;
  public loopMode: LoopMode = LoopMode.OFF;
  public isShuffled = false;
  public textChannel: TextChannel | null = null;
  
  private leaveTimeout: NodeJS.Timeout | null = null;
  private nowPlayingMessage: Message | null = null;
  private isProcessingQueue = false;

  constructor(guildId: string) {
    this.guildId = guildId;
    this.player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
      },
    });

    this.setupPlayerListeners();
  }

  private async waitForVoiceReady(connection: VoiceConnection, timeoutMs = 15000): Promise<void> {
    if (connection.state.status === VoiceConnectionStatus.Ready) {
      return;
    }
    await entersState(connection, VoiceConnectionStatus.Ready, timeoutMs);
  }

  public async connect(voiceChannel: VoiceBasedChannel, textChannel?: TextChannel): Promise<void> {
    if (textChannel) this.textChannel = textChannel;

    // Check if we already have a functional connection to this exact channel
    if (
      this.voiceConnection &&
      this.voiceConnection.joinConfig.channelId === voiceChannel.id &&
      this.voiceConnection.state.status === VoiceConnectionStatus.Ready
    ) {
      logger.info(`[Voice] Active healthy connection found in channel [${voiceChannel.id}].`);
      this.resetLeaveTimeout(false);
      return;
    }

    // Destroy any existing stale connection (from our instance)
    if (this.voiceConnection) {
      try { this.voiceConnection.destroy(); } catch (e) { /* ignore */ }
      this.voiceConnection = null;
      logger.info(`[Voice] Destroyed existing instance voice connection in guild [${this.guildId}]`);
    }

    // Also destroy any orphaned connection in the @discordjs/voice internal cache
    const orphaned = getVoiceConnection(this.guildId);
    if (orphaned) {
      try { orphaned.destroy(); } catch (e) { /* ignore */ }
      logger.info(`[Voice] Destroyed orphaned cached voice connection in guild [${this.guildId}]`);
    }

    // Retry voice connection up to 3 times
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      logger.info(`[Voice] Connection attempt ${attempt}/${MAX_RETRIES} to channel ${voiceChannel.id}`);

      try {
        if (this.voiceConnection) {
          const oldConn: VoiceConnection = this.voiceConnection;
          this.voiceConnection = null;
          try { oldConn.destroy(); } catch (e) { /* ignore */ }
          await new Promise((r) => setTimeout(r, 500));
        }

        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId: voiceChannel.guild.id,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator as any,
          selfDeaf: true,
          selfMute: false,
        });

        this.voiceConnection = connection;

        connection.on('debug', (msg) => {
          logger.info(`[Voice Debug] ${msg}`);
        });

        connection.on('stateChange', (oldState, newState) => {
          logger.info(`[Voice State] ${oldState.status} ➔ ${newState.status}`);
        });

        await this.waitForVoiceReady(connection, 15_000);
        logger.info(`🟢 Voice connection Ready in guild [${this.guildId}] (attempt ${attempt})`);

        this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async () => {
          logger.warn(`[Voice] Connection disconnected in guild [${this.guildId}]`);
          if (!this.voiceConnection) return;
          try {
            await Promise.race([
              this.waitForVoiceReady(this.voiceConnection, 5_000),
              new Promise((r) => setTimeout(r, 5_000)),
            ]);
            if (this.voiceConnection?.state.status === VoiceConnectionStatus.Ready) {
              logger.info(`[Voice] Successfully recovered voice connection`);
              return;
            }
          } catch (e) {
            /* ignore */
          }
          this.destroy();
        });

        lastError = null;
        break; // Success!
      } catch (err) {
        lastError = err as Error;
        logger.warn(`[Voice] Attempt ${attempt} failed: ${(err as Error).message}. Status: ${this.voiceConnection?.state.status}`);
        if (this.voiceConnection) {
          try { this.voiceConnection.destroy(); } catch (e) { /* ignore */ }
          this.voiceConnection = null;
        }

        if (attempt < MAX_RETRIES) {
          logger.info(`[Voice] Waiting 1.5s before retry...`);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }

    if (lastError || !this.voiceConnection) {
      throw new Error(`Voice connection failed after ${MAX_RETRIES} attempts: ${lastError?.message || 'unknown'}`);
    }

    const subscription = this.voiceConnection.subscribe(this.player);
    if (!subscription) {
      logger.error(`❌ [Voice] Audio player subscription failed in guild [${this.guildId}]`);
      throw new Error('Audio player subscription failed');
    }
    logger.info(`[Voice] Audio player subscription successful in guild [${this.guildId}]`);

    this.resetLeaveTimeout(false);
  }

  public addTracks(tracks: TrackMetadata[]): void {
    this.queue.push(...tracks);
    this.resetLeaveTimeout(false);

    if (this.player.state.status === AudioPlayerStatus.Idle && !this.currentTrack) {
      this.processQueue();
    }
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    try {
      if (this.queue.length === 0) {
        this.currentTrack = null;
        this.resetLeaveTimeout(true);
        this.isProcessingQueue = false;
        return;
      }

      this.resetLeaveTimeout(false);
      const nextTrack = this.queue.shift()!;
      this.currentTrack = nextTrack;

      logger.info(`Guild [${this.guildId}] Playing track: "${nextTrack.title}" by ${nextTrack.artist}`);

      logger.info(`[Voice] VoiceConnection status before play: ${this.voiceConnection?.state.status}`);
      if (this.voiceConnection && this.voiceConnection.state.status !== VoiceConnectionStatus.Ready) {
        try {
          await this.waitForVoiceReady(this.voiceConnection, 10_000);
          logger.info(`[Voice] VoiceConnection successfully reached Ready state`);
        } catch (e) {
          throw new Error(`Voice connection not ready before playback: ${(e as Error).message}`);
        }
      }

      const resource = await AudioResolver.createAudioResourceForTrack(nextTrack);
      if (resource.volume) {
        resource.volume.setVolume(this.volume / 100);
      }
      this.player.play(resource);

      await this.sendNowPlayingEmbed(nextTrack);
    } catch (err) {
      logger.error(`Error playing track in guild [${this.guildId}]: ${(err as Error).message}\n${(err as Error).stack}`);
      if (this.textChannel) {
        this.textChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#FF0033')
              .setTitle('⚠️ Playback Error')
              .setDescription(`Failed to play **${this.currentTrack?.title || 'requested track'}**. Skipping to next track.`),
          ],
        });
      }
      this.isProcessingQueue = false;
      this.skip();
      return;
    }

    this.isProcessingQueue = false;
  }

  private setupPlayerListeners(): void {
    this.player.on('stateChange', (oldState, newState) => {
      logger.info(`[Player] Status: ${oldState.status} → ${newState.status}`);
    });

    this.player.on('error', (error) => {
      logger.error(`❌ Audio player error in guild [${this.guildId}]: ${error.message}`);
      this.currentTrack = null;
      this.player.stop(true);
      this.isProcessingQueue = false;
      this.processQueue();
    });

    this.player.on(AudioPlayerStatus.Playing, () => {
      logger.info(`▶️ Audio player started playing in guild [${this.guildId}]`);
    });

    this.player.on(AudioPlayerStatus.Buffering, () => {
      logger.info(`⏳ Audio player buffering in guild [${this.guildId}]`);
    });

    this.player.on(AudioPlayerStatus.Idle, () => {
      logger.info(`⏹️ Audio player idle in guild [${this.guildId}]`);
      if (this.currentTrack) {
        this.previousTracks.push(this.currentTrack);
        if (this.previousTracks.length > 50) this.previousTracks.shift();

        if (this.loopMode === LoopMode.TRACK) {
          this.queue.unshift(this.currentTrack);
        } else if (this.loopMode === LoopMode.QUEUE) {
          this.queue.push(this.currentTrack);
        }
      }

      this.currentTrack = null;
      this.processQueue();
    });
  }

  public skip(): void {
    this.player.stop();
  }

  public pause(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Playing) {
      this.player.pause();
      return true;
    }
    return false;
  }

  public resume(): boolean {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return true;
    }
    return false;
  }

  public stop(): void {
    this.queue = [];
    this.currentTrack = null;
    this.player.stop();
    this.resetLeaveTimeout(true);
  }

  public shuffle(): void {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
    this.isShuffled = !this.isShuffled;
  }

  public setLoopMode(mode: LoopMode): LoopMode {
    this.loopMode = mode;
    return this.loopMode;
  }

  public removeTrack(index: number): TrackMetadata | null {
    if (index < 0 || index >= this.queue.length) return null;
    return this.queue.splice(index, 1)[0];
  }

  public clearQueue(): void {
    this.queue = [];
  }

  public resetLeaveTimeout(startTimer: boolean): void {
    if (this.leaveTimeout) {
      clearTimeout(this.leaveTimeout);
      this.leaveTimeout = null;
    }

    if (startTimer) {
      this.leaveTimeout = setTimeout(() => {
        logger.info(`Inactivity timeout reached for guild [${this.guildId}]. Leaving voice channel.`);
        if (this.textChannel) {
          this.textChannel.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#FF9900')
                .setDescription('👋 Left the voice channel due to inactivity.'),
            ],
          });
        }
        this.destroy();
      }, env.LEAVE_TIMEOUT_SECONDS * 1000);
    }
  }

  public async sendNowPlayingEmbed(track: TrackMetadata): Promise<void> {
    if (!this.textChannel) return;

    const embed = new EmbedBuilder()
      .setColor('#1DB954') // Spotify green vibe
      .setAuthor({ name: 'Vynx • Now Playing', iconURL: 'https://i.imgur.com/v8tT94u.png' })
      .setTitle(`${track.title}`)
      .setURL(track.spotifyUrl || track.sourceUrl || null)
      .setDescription(`**Artist:** ${track.artist}\n**Album:** ${track.album || 'N/A'}`)
      .addFields(
        { name: 'Duration', value: formatDuration(track.durationMs), inline: true },
        { name: 'Requested By', value: `<@${track.requestedBy.id}>`, inline: true },
        { name: 'Source', value: `${track.spotifyUrl ? '🟢 Spotify' : '🔴 YouTube'}`, inline: true },
        { name: 'Queue Status', value: `${this.queue.length} track(s) waiting | Loop: ${this.loopMode}`, inline: false }
      )
      .setThumbnail(track.thumbnailUrl || null)
      .setTimestamp();

    const buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('btn_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_playpause')
        .setEmoji(this.player.state.status === AudioPlayerStatus.Playing ? '⏸️' : '▶️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_shuffle')
        .setEmoji('🔀')
        .setStyle(this.isShuffled ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_loop')
        .setEmoji('🔁')
        .setStyle(this.loopMode !== LoopMode.OFF ? ButtonStyle.Success : ButtonStyle.Secondary)
    );

    try {
      this.nowPlayingMessage = await this.textChannel.send({
        embeds: [embed],
        components: [buttons],
      });
    } catch (err) {
      logger.error(`Failed to send Now Playing embed: ${(err as Error).message}`);
    }
  }

  public destroy(): void {
    this.stop();
    if (this.voiceConnection) {
      this.voiceConnection.destroy();
      this.voiceConnection = null;
    }
  }
}
