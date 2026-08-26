# 🎵 Fyro

A Discord music bot built with TypeScript, discord.js v14, Spotify API, Postgres, and Redis.

## ⚡ Features

- **Spotify Playback**: Stream tracks, albums, and playlists straight from Spotify links or search terms.
- **Interactive Player**: Now Playing embeds with interactive button controls (`⏮️`, `▶️/⏸️`, `⏭️`, `🔀`, `🔁`).
- **Radio & Mood Playlists**:
  - `/vibe <mood>`: Quick playlists for chill, workout, party, focus, gaming, or sleep.
  - `/radio <target>`: Endless queue based on an artist or genre.
- **Favorites & History**: Save tracks with `/favorites` and view past songs with `/history`.
- **Fast & Reliable**: Uses Redis for queue caching and PostgreSQL for saving server settings and user favorites.

## 🛠️ Commands

| Command | Description |
| :--- | :--- |
| `/play <query>` | Play a song, album, Spotify link, or search query |
| `/pause` & `/resume` | Pause or resume audio |
| `/skip` & `/stop` | Skip current track or stop playback |
| `/queue` | View upcoming tracks in queue |
| `/nowplaying` | Show interactive player controls |
| `/radio <target>` | Start an endless artist/genre radio stream |
| `/vibe <mood>` | Play mood-based music |
| `/favorites` | Save or list your favorite songs |
| `/history` | View recently played tracks |
| `/settings` | Adjust default volume and leave timeout |
| `/help` | List available commands |

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/Shreya-J-5/Fyro.git
cd Fyro
npm install
```

### 2. Set up Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Fill in your credentials in `.env`:
```env
DISCORD_TOKEN=your_discord_token
DISCORD_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
```

### 3. Register Commands & Run
```bash
# Register slash commands with Discord
npm run register

# Start development mode
npm run dev
```

## 🐳 Docker Setup

Run Fyro along with PostgreSQL and Redis:

```bash
docker-compose up -d --build
```
