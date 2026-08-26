# 🔥 Fyro — High-Performance Discord Music Bot 🎵

> *Elevate your server's sound with seamless Spotify metadata resolution, interactive player controls, dynamic vibe streams, and real-time audio playback.* 🚀

---

## ✨ Features

- 🎧 **Spotify & Web API Integration**: Play tracks, albums, and playlists seamlessly from Spotify links & search queries.
- ⚡ **Interactive Now-Playing Panel**: Real-time progress bar with interactive control buttons (`⏮️`, `▶️/⏸️`, `⏭️`, `🔀`, `🔁`).
- 📻 **Vibe & Radio Discovery**:
  - `/vibe <mood>`: Instant mood playlists (*chill, workout, party, focus, gaming, sleep*).
  - `/radio <target>`: Continuous song discovery based on your favorite artist or genre.
- 💾 **Favorites & History**: Save tracks with `/favorites` and view guild playback history with `/history`.
- 🚀 **Production Stack**: Built with **TypeScript**, **discord.js v14**, **PostgreSQL** & **Redis** for cached queues and state persistence.

---

## 🛠️ Quick Commands

| Command | Description |
| :--- | :--- |
| 🎶 `/play <query>` | Play a track, album, Spotify link, or search query |
| ⏸️ `/pause` & ▶️ `/resume` | Pause or resume track playback |
| ⏭️ `/skip` & 🛑 `/stop` | Skip current track or stop playback & clear queue |
| 📑 `/queue` | View upcoming queued tracks |
| 🎛️ `/nowplaying` | Show interactive music player panel |
| 📻 `/radio <target>` | Start an endless artist/genre radio |
| 🎭 `/vibe <mood>` | Play instant mood-based playlist |
| ❤️ `/favorites` | Manage your saved favorite tracks |
| ⚙️ `/settings` | Configure server volume & leave timeout |
| ❓ `/help` | Interactive command list |

---

## 🚀 Quick Start

### 1️⃣ Clone & Install
```bash
git clone https://github.com/Shreya-J-5/Fyro.git
cd Fyro
npm install
```

### 2️⃣ Configure Environment
Copy `.env.example` to `.env` and add your keys:
```bash
cp .env.example .env
```
Add your credentials in `.env`:
```env
DISCORD_TOKEN=your_discord_token
DISCORD_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
```

### 3️⃣ Register Commands & Run
```bash
# Build TypeScript
npm run build

# Register Slash Commands with Discord
npm run register

# Run Dev Server
npm run dev
```

---

## 🐳 Docker Deployment

Run the complete Fyro stack (Bot + PostgreSQL + Redis) using Docker:

```bash
docker-compose up -d --build
```

---

## 🛡️ Security & Privacy

🔒 **Zero Credential Exposure**: All API keys and secret tokens are managed exclusively through `.env` variables and excluded from Git version control.

---

<p align="center">Made with ❤️ for Discord music communities</p>
