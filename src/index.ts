import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import ffmpegPath from 'ffmpeg-static';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { env } from './config/env';
import { logger } from './config/logger';

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}
import { handleReady } from './events/ready';
import { handleInteraction } from './events/interactionCreate';
import { registerSlashCommands } from './scripts/registerCommands';

import { generateDependencyReport } from '@discordjs/voice';
import sodium from 'libsodium-wrappers';

logger.info(`[Startup] Environment loaded`);
logger.info(`[Startup] Discord token configured: ${Boolean(env.DISCORD_TOKEN)}`);
logger.info(`[Startup] Configured Client ID: ${env.DISCORD_CLIENT_ID}`);

(async () => {
  await sodium.ready;
  logger.info(`[Startup] libsodium-wrappers initialized and ready.`);
})();

logger.info(`[Startup] Voice Dependency Report:\n${generateDependencyReport()}`);

logger.info(`[Startup] Creating Discord client...`);
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

logger.info(`[Startup] Registering event handlers...`);

client.once(Events.ClientReady, async (c) => {
  logger.info(`[Discord] Ready event received!`);
  logger.info(`[Discord] Logged in as: ${c.user.tag}`);
  logger.info(`[Discord] Bot ID: ${c.user.id}`);
  logger.info(`[Discord] Connected guild count: ${c.guilds.cache.size}`);

  handleReady(client);
  await registerSlashCommands();
});

client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction);
});

client.on('error', (err) => {
  logger.error(`[Discord Client Error]: ${err.message}`);
});

client.on('shardError', (err) => {
  logger.error(`[Discord Shard Error]: ${err.message}`);
});

client.on('warn', (warning) => {
  logger.warn(`[Discord Warning]: ${warning}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`[Uncaught Exception]: ${err.message}\n${err.stack}`);
});

process.on('unhandledRejection', (reason) => {
  logger.error(`[Unhandled Rejection]: ${reason}`);
});

import http from 'http';

// UptimeRobot / Render Cloud Deployment Health Check HTTP Server
const PORT = process.env.PORT || 10000;
const server = http.createServer((req, res) => {
  const url = req.url || '/';
  if (url === '/' || url === '/health' || url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        bot: 'Fyro Discord Bot',
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
      })
    );
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Fyro Bot Active\n');
  }
});

server.on('error', (err: any) => {
  logger.warn(`[HTTP Server] Warning: ${err.message}`);
});

server.listen(Number(PORT), '0.0.0.0', () => {
  logger.info(`[UptimeRobot/Render] Health check HTTP server active on port ${PORT}`);
});

logger.info(`[Startup] Attempting Discord login...`);
client.login(env.DISCORD_TOKEN).catch((err) => {
  logger.error(`❌ [Startup] Failed to login to Discord: ${err.message}`);
  process.exit(1);
});
