import SpotifyWebApi from 'spotify-web-api-node';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface SpotifyTrackInfo {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  thumbnailUrl: string;
  spotifyUrl: string;
}

export class SpotifyService {
  private spotifyApi: SpotifyWebApi | null = null;
  private tokenExpirationTime = 0;
  private isConfigured = false;

  constructor() {
    if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
      this.spotifyApi = new SpotifyWebApi({
        clientId: env.SPOTIFY_CLIENT_ID,
        clientSecret: env.SPOTIFY_CLIENT_SECRET,
      });
      this.isConfigured = true;
      logger.info('🟢 Spotify Service initialized with Client Credentials');
    } else {
      logger.warn('⚠️ Spotify Client ID/Secret not fully configured. Spotify direct link parsing will run with fallback mode.');
    }
  }

  private async ensureToken(): Promise<boolean> {
    if (!this.isConfigured || !this.spotifyApi) return false;

    if (Date.now() < this.tokenExpirationTime - 60000) {
      return true;
    }

    try {
      const data = await this.spotifyApi.clientCredentialsGrant();
      this.spotifyApi.setAccessToken(data.body['access_token']);
      this.tokenExpirationTime = Date.now() + data.body['expires_in'] * 1000;
      logger.debug('🔑 Successfully refreshed Spotify Client Credentials token');
      return true;
    } catch (err) {
      logger.error('❌ Failed to authenticate with Spotify API: ' + (err as Error).message);
      return false;
    }
  }

  public async getTrack(trackId: string): Promise<SpotifyTrackInfo | null> {
    if (!(await this.ensureToken()) || !this.spotifyApi) return null;

    try {
      const res = await this.spotifyApi.getTrack(trackId);
      const track = res.body;
      return {
        id: track.id,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album.name,
        durationMs: track.duration_ms,
        thumbnailUrl: track.album.images[0]?.url || '',
        spotifyUrl: track.external_urls.spotify,
      };
    } catch (err) {
      logger.error(`Failed to fetch Spotify track ${trackId}: ${(err as Error).message}`);
      return null;
    }
  }

  public async getAlbumTracks(albumId: string): Promise<SpotifyTrackInfo[]> {
    if (!(await this.ensureToken()) || !this.spotifyApi) return [];

    try {
      const albumRes = await this.spotifyApi.getAlbum(albumId);
      const album = albumRes.body;
      const tracksRes = await this.spotifyApi.getAlbumTracks(albumId, { limit: 50 });

      return tracksRes.body.items.map((track) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: album.name,
        durationMs: track.duration_ms,
        thumbnailUrl: album.images[0]?.url || '',
        spotifyUrl: track.external_urls.spotify,
      }));
    } catch (err) {
      logger.error(`Failed to fetch Spotify album ${albumId}: ${(err as Error).message}`);
      return [];
    }
  }

  public async getPlaylistTracks(playlistId: string): Promise<SpotifyTrackInfo[]> {
    if (!(await this.ensureToken()) || !this.spotifyApi) return [];

    try {
      const playlistRes = await this.spotifyApi.getPlaylist(playlistId);
      const playlist = playlistRes.body;
      const tracks: SpotifyTrackInfo[] = [];

      for (const item of playlist.tracks.items) {
        if (!item.track || item.track.type !== 'track') continue;
        const track = item.track;
        tracks.push({
          id: track.id,
          title: track.name,
          artist: track.artists.map((a) => a.name).join(', '),
          album: track.album.name,
          durationMs: track.duration_ms,
          thumbnailUrl: track.album.images[0]?.url || '',
          spotifyUrl: track.external_urls.spotify,
        });
      }
      return tracks;
    } catch (err) {
      logger.error(`Failed to fetch Spotify playlist ${playlistId}: ${(err as Error).message}`);
      return [];
    }
  }

  public async searchTracks(query: string, limit = 5): Promise<SpotifyTrackInfo[]> {
    if (!(await this.ensureToken()) || !this.spotifyApi) return [];

    try {
      const res = await this.spotifyApi.searchTracks(query, { limit });
      if (!res.body.tracks) return [];

      return res.body.tracks.items.map((track) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album: track.album.name,
        durationMs: track.duration_ms,
        thumbnailUrl: track.album.images[0]?.url || '',
        spotifyUrl: track.external_urls.spotify,
      }));
    } catch (err) {
      logger.error(`Spotify search error for "${query}": ${(err as Error).message}`);
      return [];
    }
  }
}

export const spotifyService = new SpotifyService();
