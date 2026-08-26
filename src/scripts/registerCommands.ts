import { REST, Routes } from 'discord.js';
import { env } from '../config/env';
import { commandsList } from '../commands';
import { logger } from '../config/logger';

export async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  const commandData = commandsList.map((cmd) => cmd.data.toJSON());

  try {
    logger.info(`Started refreshing ${commandData.length} application (/) commands.`);

    if (env.DISCORD_GUILD_ID) {
      // Guild-scoped command registration for instantaneous dev testing
      await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), {
        body: commandData,
      });
      logger.info(`Successfully registered commands for dev guild ID: ${env.DISCORD_GUILD_ID}`);
    } else {
      // Global command registration for production
      await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), {
        body: commandData,
      });
      logger.info('Successfully registered application (/) commands globally.');
    }
  } catch (error) {
    logger.error(`Failed to register slash commands: ${(error as Error).message}`);
  }
}

if (require.main === module) {
  registerSlashCommands();
}
