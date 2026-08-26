import { Collection } from 'discord.js';
import { Command } from './Command';
import { playCommand } from './music/play';
import { pauseCommand, resumeCommand } from './music/pauseResume';
import { skipCommand, stopCommand } from './music/skipStop';
import { nowplayingCommand, queueCommand, viewQueueCommand } from './music/queueNowplaying';
import { clearCommand, clearQueueCommand, joinCommand, leaveCommand, loopCommand, removeCommand, shuffleCommand } from './music/controls';
import { radioCommand, searchCommand, vibeCommand } from './discovery/discovery';
import { favoritesCommand, historyCommand } from './user/userCommands';
import { settingsCommand } from './admin/settings';
import { helpCommand, pingCommand, statsCommand } from './utility/utilityCommands';

export const commandsList: Command[] = [
  playCommand,
  pauseCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
  queueCommand,
  viewQueueCommand,
  nowplayingCommand,
  shuffleCommand,
  loopCommand,
  removeCommand,
  clearCommand,
  clearQueueCommand,
  joinCommand,
  leaveCommand,
  vibeCommand,
  radioCommand,
  searchCommand,
  favoritesCommand,
  historyCommand,
  settingsCommand,
  pingCommand,
  statsCommand,
  helpCommand,
];

export const commandsCollection = new Collection<string, Command>();
for (const cmd of commandsList) {
  commandsCollection.set(cmd.data.name, cmd);
}
