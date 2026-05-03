import { SlashCommandBuilder, ApplicationCommandOptionType } from 'discord.js';
import type {
  ActionCommand,
  OptionCommand,
} from 'shared/src/types/discord.types';

const OPTION_TYPE_MAP: Record<string, ApplicationCommandOptionType> = {
  STRING: ApplicationCommandOptionType.String,
  INTEGER: ApplicationCommandOptionType.Integer,
  BOOLEAN: ApplicationCommandOptionType.Boolean,
  USER: ApplicationCommandOptionType.User,
  CHANNEL: ApplicationCommandOptionType.Channel,
  ROLE: ApplicationCommandOptionType.Role,
  MENTIONABLE: ApplicationCommandOptionType.Mentionable,
  NUMBER: ApplicationCommandOptionType.Number,
  ATTACHMENT: ApplicationCommandOptionType.Attachment,
};

export function formatSlashCommand(
  command: ActionCommand,
): SlashCommandBuilder {
  const builder = new SlashCommandBuilder()
    .setName(command.name)
    .setDescription(command.description);

  if (command.optionalArgs) {
    for (const opt of command.optionalArgs) {
      addOption(builder, opt);
    }
  }

  return builder;
}

function addOption(builder: SlashCommandBuilder, opt: OptionCommand): void {
  const type = opt.type
    ? OPTION_TYPE_MAP[opt.type]
    : ApplicationCommandOptionType.String;

  switch (type) {
    case ApplicationCommandOptionType.String:
      builder.addStringOption((o) => {
        o.setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false);
        if (opt.maxLength) o.setMaxLength(opt.maxLength);
        if (opt.minLength) o.setMinLength(opt.minLength);
        if (opt.choices)
          o.addChoices(
            ...opt.choices.map((c) => ({
              name: c.name,
              value: String(c.value),
            })),
          );
        if (opt.autocomplete) o.setAutocomplete(true);
        return o;
      });
      break;

    case ApplicationCommandOptionType.Integer:
      builder.addIntegerOption((o) => {
        o.setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false);
        if (opt.maxValue !== undefined) o.setMaxValue(opt.maxValue);
        if (opt.minValue !== undefined) o.setMinValue(opt.minValue);
        if (opt.choices)
          o.addChoices(
            ...opt.choices.map((c) => ({
              name: c.name,
              value: Number(c.value),
            })),
          );
        return o;
      });
      break;

    case ApplicationCommandOptionType.Number:
      builder.addNumberOption((o) => {
        o.setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false);
        if (opt.maxValue !== undefined) o.setMaxValue(opt.maxValue);
        if (opt.minValue !== undefined) o.setMinValue(opt.minValue);
        return o;
      });
      break;

    case ApplicationCommandOptionType.Boolean:
      builder.addBooleanOption((o) =>
        o
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false),
      );
      break;

    case ApplicationCommandOptionType.User:
      builder.addUserOption((o) =>
        o
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false),
      );
      break;

    case ApplicationCommandOptionType.Channel:
      builder.addChannelOption((o) =>
        o
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false),
      );
      break;

    case ApplicationCommandOptionType.Role:
      builder.addRoleOption((o) =>
        o
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false),
      );
      break;

    case ApplicationCommandOptionType.Mentionable:
      builder.addMentionableOption((o) =>
        o
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false),
      );
      break;

    case ApplicationCommandOptionType.Attachment:
      builder.addAttachmentOption((o) =>
        o
          .setName(opt.name)
          .setDescription(opt.description)
          .setRequired(opt.required ?? false),
      );
      break;
  }
}
