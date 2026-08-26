import { createAudioResource, AudioResource, StreamType } from '@discordjs/voice';
import youtubedl from 'youtube-dl-exec';
import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { TrackMetadata } from './Track';
import { spotifyService } from '../spotify/spotifyClient';
import { logger } from '../config/logger';

export class AudioResolver {
  public static async resolveInput(
    input: string,
    user: { id: string; username: string; avatarUrl?: string }
  ): Promise<TrackMetadata[]> {
    try {
      logger.info(`[Resolver] START`);
      logger.info(`[Resolver] Input: "${input}"`);

      const trimmed = input.trim();

      if (!trimmed) {
        throw new Error('Input query is empty');
      }

      logger.info(`[Resolver] Input trimmed successfully`);

      // Check if Spotify link
      if (trimmed.includes('spotify.com/')) {
        logger.info(`[Resolver] Stage: Spotify URL resolution`);
        return await this.resolveSpotifyUrl(trimmed, user);
      }

      // Check if YouTube link
      if (trimmed.includes('youtube.com/watch') || trimmed.includes('youtu.be/')) {
        logger.info(`[Resolver] Stage: YouTube URL resolution`);
        return await this.resolveYouTubeVideo(trimmed, user);
      }

      // Default to Spotify Search first, then YouTube fallback
      logger.info(`[Resolver] Stage: Search query resolution`);
      return await this.resolveSearchQuery(trimmed, user);
    } catch (error) {
      logger.error(`[Resolver] FATAL ERROR: ${error instanceof Error ? error.message : String(error)}`);
      logger.error(`[Resolver] STACK: ${error instanceof Error ? error.stack : 'No stack'}`);
      throw error;
    }
  }

  private static async resolveSpotifyUrl(
    url: string,
    user: { id: string; username: string; avatarUrl?: string }
  ): Promise<TrackMetadata[]> {
    const tracks: TrackMetadata[] = [];
    
    const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
    const albumMatch = url.match(/album\/([a-zA-Z0-9]+)/);
    const playlistMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);

    if (trackMatch) {
      const spotifyInfo = await spotifyService.getTrack(trackMatch[1]);
      if (spotifyInfo) {
        tracks.push({
          id: `sp_${spotifyInfo.id}`,
          title: spotifyInfo.title,
          artist: spotifyInfo.artist,
          album: spotifyInfo.album,
          durationMs: spotifyInfo.durationMs,
          thumbnailUrl: spotifyInfo.thumbnailUrl,
          requestedBy: user,
          spotifyUrl: spotifyInfo.spotifyUrl,
          playbackSource: 'Spotify',
          addedTimestamp: Date.now(),
        });
      }
    } else if (albumMatch) {
      const albumTracks = await spotifyService.getAlbumTracks(albumMatch[1]);
      for (const track of albumTracks) {
        tracks.push({
          id: `sp_${track.id}`,
          title: track.title,
          artist: track.artist,
          album: track.album,
          durationMs: track.durationMs,
          thumbnailUrl: track.thumbnailUrl,
          requestedBy: user,
          spotifyUrl: track.spotifyUrl,
          playbackSource: 'Spotify',
          addedTimestamp: Date.now(),
        });
      }
    } else if (playlistMatch) {
      const playlistTracks = await spotifyService.getPlaylistTracks(playlistMatch[1]);
      for (const track of playlistTracks) {
        tracks.push({
          id: `sp_${track.id}`,
          title: track.title,
          artist: track.artist,
          album: track.album,
          durationMs: track.durationMs,
          thumbnailUrl: track.thumbnailUrl,
          requestedBy: user,
          spotifyUrl: track.spotifyUrl,
          playbackSource: 'Spotify',
          addedTimestamp: Date.now(),
        });
      }
    }

    if (tracks.length === 0) {
      logger.warn(`[Audio] Spotify API resolution returned 0 tracks for ${url}. Attempting search fallback.`);
      return this.resolveSearchQuery(url, user);
    }

    return tracks;
  }

  public static async resolveYouTubeVideo(
    url: string,
    user: { id: string; username: string; avatarUrl?: string }
  ): Promise<TrackMetadata[]> {
    try {
      logger.info(`[Audio] Fetching YouTube video metadata for: ${url}`);
      const info = (await youtubedl(url, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
        preferFreeFormats: true,
      })) as any;

      return [
        {
          id: `yt_${info.id}`,
          title: info.title || 'Unknown Title',
          artist: info.uploader || info.channel || 'Unknown Artist',
          durationMs: (info.duration || 0) * 1000,
          thumbnailUrl: info.thumbnail || '',
          requestedBy: user,
          sourceUrl: info.webpage_url || url,
          playbackSource: 'YouTube',
          addedTimestamp: Date.now(),
        },
      ];
    } catch (err) {
      logger.error(`[Audio] Failed to resolve YouTube video via yt-dlp: ${(err as Error).message}`);
      return [];
    }
  }

  public static async resolveSearchQuery(
    query: string,
    user: { id: string; username: string; avatarUrl?: string }
  ): Promise<TrackMetadata[]> {
    // 1. Try Spotify search via Spotify API first for rich metadata
    try {
      const spotifyResults = await spotifyService.searchTracks(query, 1);
      if (spotifyResults.length > 0) {
        const track = spotifyResults[0];
        logger.info(`[Audio] Found track via Spotify API: "${track.title}" by ${track.artist}`);
        return [
          {
            id: `sp_${track.id}`,
            title: track.title,
            artist: track.artist,
            album: track.album,
            durationMs: track.durationMs,
            thumbnailUrl: track.thumbnailUrl,
            requestedBy: user,
            spotifyUrl: track.spotifyUrl,
            playbackSource: 'Spotify',
            addedTimestamp: Date.now(),
          },
        ];
      }
    } catch (err) {
      logger.warn(`[Audio] Spotify API search failed for "${query}": ${(err as Error).message}. Falling back to YouTube search.`);
    }

    // 2. Fallback to YouTube Search if Spotify API returns no match
    try {
      logger.info(`[Audio] Searching YouTube via yt-dlp for query: "${query}"`);
      const searchOutput = (await youtubedl(`ytsearch1:${query}`, {
        dumpSingleJson: true,
        noCheckCertificates: true,
        noWarnings: true,
      })) as any;

      if (!searchOutput || !searchOutput.entries || searchOutput.entries.length === 0) {
        return [];
      }

      const video = searchOutput.entries[0];
      return [
        {
          id: `yt_${video.id}`,
          title: video.title || query,
          artist: video.uploader || video.channel || 'Unknown Artist',
          durationMs: (video.duration || 0) * 1000,
          thumbnailUrl: video.thumbnail || '',
          requestedBy: user,
          sourceUrl: video.webpage_url,
          playbackSource: 'YouTube',
          addedTimestamp: Date.now(),
        },
      ];
    } catch (err) {
      logger.error(`[Audio] Search query resolution error for "${query}": ${(err as Error).message}`);
      return [];
    }
  }

  public static async createAudioResourceForTrack(track: TrackMetadata): Promise<AudioResource> {
    logger.info(`[Audio] Track selected: "${track.title}" by ${track.artist}`);
    let targetUrl = track.sourceUrl;

    if (!targetUrl) {
      const searchQuery = `${track.title} ${track.artist}`;
      try {
        logger.info(`[Audio] Resolving playable source for track: "${searchQuery}"...`);
        const searchOutput = (await youtubedl(`ytsearch1:${searchQuery}`, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
        })) as any;

        if (searchOutput && searchOutput.entries && searchOutput.entries.length > 0) {
          targetUrl = searchOutput.entries[0].webpage_url;
          logger.info(`[Audio] Playable source URL found: ${targetUrl}`);
        }
      } catch (err) {
        logger.warn(`[Audio] Playable YouTube search failed for "${searchQuery}": ${(err as Error).message}`);
      }
    }

    if (!targetUrl) {
      throw new Error(`Could not resolve playable audio source for track: ${track.title} - ${track.artist}`);
    }

    try {
      logger.info(`[yt-dlp] Process started for: ${targetUrl}`);
      const ytdlProcess = youtubedl.exec(
        targetUrl,
        {
          output: '-',
          format: 'bestaudio/best',
          noCheckCertificates: true,
          noWarnings: true,
        },
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      logger.info(`[FFmpeg] Process started for OggOpus encoding...`);
      const ffmpegProcess = spawn(
        ffmpegPath!,
        [
          '-i', 'pipe:0',
          '-c:a', 'libopus',
          '-b:a', '128k',
          '-ar', '48000',
          '-ac', '2',
          '-f', 'ogg',
          'pipe:1',
        ],
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );

      let ytdlpTotalBytes = 0;
      let ffmpegTotalBytes = 0;

      ytdlProcess.stdout.on('data', (chunk: Buffer) => {
        ytdlpTotalBytes += chunk.length;
        if (ytdlpTotalBytes <= chunk.length || ytdlpTotalBytes % 500000 < chunk.length) {
          logger.info(`[yt-dlp] Audio bytes received: ${chunk.length} bytes (Total: ${ytdlpTotalBytes} bytes)`);
        }
      });

      ffmpegProcess.stdout.on('data', (chunk: Buffer) => {
        ffmpegTotalBytes += chunk.length;
        if (ffmpegTotalBytes <= chunk.length || ffmpegTotalBytes % 200000 < chunk.length) {
          logger.info(`[FFmpeg] Audio bytes received on stdout: ${chunk.length} bytes (Total: ${ffmpegTotalBytes} bytes)`);
        }
      });

      ytdlProcess.stdout.pipe(ffmpegProcess.stdin);

      ytdlProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) logger.info(`[yt-dlp log] ${msg}`);
      });

      ffmpegProcess.stderr.on('data', (data) => {
        const msg = data.toString().trim();
        if (msg) logger.info(`[FFmpeg log] ${msg}`);
      });

      ytdlProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          logger.error(`❌ [yt-dlp] process exited with code: ${code}`);
        } else {
          logger.info(`[yt-dlp] process exited cleanly. Total extracted: ${ytdlpTotalBytes} bytes`);
        }
      });

      ffmpegProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          logger.error(`❌ [FFmpeg] process exited with code: ${code}`);
        } else {
          logger.info(`[FFmpeg] process exited cleanly. Total encoded: ${ffmpegTotalBytes} bytes`);
        }
      });

      ytdlProcess.on('error', (err) => {
        logger.error(`❌ [yt-dlp] spawn error: ${err.message}`);
      });

      ffmpegProcess.on('error', (err) => {
        logger.error(`❌ [FFmpeg] spawn error: ${err.message}`);
      });

      logger.info(`[Discord] AudioResource created with StreamType.OggOpus`);

      return createAudioResource(ffmpegProcess.stdout, {
        inputType: StreamType.OggOpus,
        inlineVolume: true,
      });
    } catch (err) {
      logger.error(`[Audio] Failed to create audio resource for ${targetUrl}: ${(err as Error).message}`);
      throw new Error(`Audio extraction failed: ${(err as Error).message}`);
    }
  }
}
