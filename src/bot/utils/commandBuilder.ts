import { SlashCommandBuilder, ChannelType } from 'discord.js';
import { ActionCommand } from '@src/shared/types/bot.types';

const validateCommandName = (name: string): void => {
  if (name.length < 1 || name.length > 32) {
    throw new Error(`Command name "${name}" must be between 1-32 characters`);
  }
  if (!/^[a-z0-9-_]+$/.test(name)) {
    throw new Error(`Command name "${name}" must contain only lowercase letters, numbers, hyphens, and underscores`);
  }
};

const validateCommandDescription = (description: string): void => {
  if (description.length < 1 || description.length > 100) {
    throw new Error(`Command description must be between 1-100 characters`);
  }
};

const validateOptionName = (name: string): void => {
  if (name.length < 1 || name.length > 32) {
    throw new Error(`Option name "${name}" must be between 1-32 characters`);
  }
  if (!/^[a-z0-9-_]+$/.test(name)) {
    throw new Error(`Option name "${name}" must contain only lowercase letters, numbers, hyphens, and underscores`);
  }
};

type AllowedChannelType = 
  | ChannelType.GuildText 
  | ChannelType.GuildVoice 
  | ChannelType.GuildCategory 
  | ChannelType.GuildAnnouncement 
  | ChannelType.AnnouncementThread 
  | ChannelType.PublicThread 
  | ChannelType.PrivateThread 
  | ChannelType.GuildStageVoice 
  | ChannelType.GuildForum
  | ChannelType.GuildMedia;

const mapChannelTypes = (channelTypeIds: number[]): AllowedChannelType[] => {
  const mapped: AllowedChannelType[] = [];
  
  for (const id of channelTypeIds) {
    let channelType: AllowedChannelType | null = null;
    
    switch (id) {
      case 0: channelType = ChannelType.GuildText; break;
      case 2: channelType = ChannelType.GuildVoice; break;
      case 4: channelType = ChannelType.GuildCategory; break;
      case 5: channelType = ChannelType.GuildAnnouncement; break;
      case 10: channelType = ChannelType.AnnouncementThread; break;
      case 11: channelType = ChannelType.PublicThread; break;
      case 12: channelType = ChannelType.PrivateThread; break;
      case 13: channelType = ChannelType.GuildStageVoice; break;
      case 15: channelType = ChannelType.GuildForum; break;
      case 16: channelType = ChannelType.GuildMedia; break;
      default:
        console.warn(`Unknown channel type ID: ${id}`);
    }
    
    if (channelType !== null) {
      mapped.push(channelType);
    }
  }
  
  return mapped;
};

export const formatSlashCommand = (actionCommand: ActionCommand): SlashCommandBuilder => {
  validateCommandName(actionCommand.name);
  validateCommandDescription(actionCommand.description);

  const slashCommand = new SlashCommandBuilder()
    .setName(actionCommand.name)
    .setDescription(actionCommand.description);

  if (!actionCommand.optionalArgs) {
    return slashCommand;
  }

  const sortedOptions = [...actionCommand.optionalArgs].sort((a, b) => {
    const aRequired = a.required ?? false;
    const bRequired = b.required ?? false;
    if (aRequired === bRequired) return 0;
    return aRequired ? -1 : 1;
  });

  for (const option of sortedOptions) {
    validateOptionName(option.name);
    
    const isRequired = option.required ?? false;
    const optionType = option.type ?? 'STRING';

    switch (optionType) {
      case 'STRING':
        slashCommand.addStringOption(opt => {
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired);
          
          if (option.minLength !== undefined) {
            opt.setMinLength(Math.max(0, Math.min(6000, option.minLength)));
          }
          if (option.maxLength !== undefined) {
            opt.setMaxLength(Math.max(1, Math.min(6000, option.maxLength)));
          }
          
          if (option.choices && option.choices.length > 0) {
            const limitedChoices = option.choices.slice(0, 25);
            opt.addChoices(...limitedChoices.map(c => ({ 
              name: c.name.substring(0, 100), 
              value: String(c.value).substring(0, 100) 
            })));
          }
          
          if (option.autocomplete && !option.choices) {
            opt.setAutocomplete(true);
          }
          
          return opt;
        });
        break;

      case 'INTEGER':
      case 'NUMBER':
        slashCommand.addIntegerOption(opt => {
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired);
          
          if (option.minValue !== undefined) {
            opt.setMinValue(option.minValue);
          }
          if (option.maxValue !== undefined) {
            opt.setMaxValue(option.maxValue);
          }
          
          if (option.choices && option.choices.length > 0) {
            const limitedChoices = option.choices.slice(0, 25);
            opt.addChoices(...limitedChoices.map(c => ({ 
              name: c.name.substring(0, 100),
              value: Number(c.value)
            })));
          }
          
          if (option.autocomplete && !option.choices) {
            opt.setAutocomplete(true);
          }
          
          return opt;
        });
        break;

      case 'BOOLEAN':
        slashCommand.addBooleanOption(opt =>
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired)
        );
        break;

      case 'USER':
        slashCommand.addUserOption(opt =>
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired)
        );
        break;

      case 'CHANNEL':
        slashCommand.addChannelOption(opt => {
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired);
          
          if (option.channelTypes && option.channelTypes.length > 0) {
            const channelTypes = mapChannelTypes(option.channelTypes);
            if (channelTypes.length > 0) {
              opt.addChannelTypes(...channelTypes);
            }
          }
          
          return opt;
        });
        break;

      case 'ROLE':
        slashCommand.addRoleOption(opt =>
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired)
        );
        break;

      case 'MENTIONABLE':
        slashCommand.addMentionableOption(opt =>
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired)
        );
        break;

      case 'ATTACHMENT':
        slashCommand.addAttachmentOption(opt =>
          opt.setName(option.name)
             .setDescription(option.description)
             .setRequired(isRequired)
        );
        break;

      default:
        console.warn(`Unknown option type: ${optionType} for option: ${option.name} in command: ${actionCommand.name}`);
    }
  }

  return slashCommand;
};

export const formatSlashCommands = (actionCommands: ActionCommand[]): Map<string, SlashCommandBuilder> => {
  const commandMap = new Map<string, SlashCommandBuilder>();
  
  for (const actionCommand of actionCommands) {
    try {
      const slashCommand = formatSlashCommand(actionCommand);
      commandMap.set(actionCommand.name, slashCommand);
    } catch (error) {
      console.error(`Failed to format command "${actionCommand.name}":`, error);
    }
  }
  
  return commandMap;
};
