import {
  ChatInputCommandInteraction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  Message,
  Guild,
  TextChannel,
  User,
  GuildMember,
  VoiceChannel,
  Client,
  InteractionReplyOptions,
  InteractionEditReplyOptions,
  MessagePayload,
  BaseMessageOptions,
  InteractionResponse,
  Channel,
} from 'discord.js';

export type InteractionSource =
  | ChatInputCommandInteraction
  | ButtonInteraction
  | StringSelectMenuInteraction;
export type OptionType =
  | 'string'
  | 'integer'
  | 'boolean'
  | 'user'
  | 'channel'
  | 'role'
  | 'number'
  | 'attachment';

// ============ BASE CONTEXT ============

export abstract class BaseContext {
  public readonly client: Client;
  public readonly commandName: string | null;

  constructor(client: Client, commandName: string | null) {
    this.client = client;
    this.commandName = commandName;
  }

  abstract get guild(): Guild | null;
  abstract get guildId(): string | null;
  abstract get channel(): TextChannel | null;
  abstract get channelId(): string | null;
  abstract get user(): User;
  abstract get userId(): string;
  abstract get member(): GuildMember | null;
  abstract get voiceChannel(): VoiceChannel | null;
  abstract get voiceChannelId(): string | null | undefined;
  abstract get author(): User;

  abstract getOption(
    name: string,
    type?: OptionType,
  ): string | number | boolean | User | Channel | any | null;
  abstract reply(
    content: string | InteractionReplyOptions | MessagePayload,
  ): Promise<Message | InteractionResponse>;
  abstract defer(ephemeral?: boolean): Promise<Message | InteractionResponse>;
  abstract editReply(
    content:
      | string
      | InteractionEditReplyOptions
      | MessagePayload
      | BaseMessageOptions,
  ): Promise<Message>;
}

// ============ INTERACTION CONTEXT (Slash commands, buttons, selects) ============

export class InteractionContext extends BaseContext {
  private interaction: InteractionSource;
  private options: ChatInputCommandInteraction['options'] | null;

  constructor(interaction: InteractionSource) {
    super(
      interaction.client,
      'commandName' in interaction ? interaction.commandName : null,
    );
    this.interaction = interaction;
    this.options = interaction.isChatInputCommand()
      ? interaction.options
      : null;
  }

  get guild(): Guild | null {
    return this.interaction.guild;
  }
  get guildId(): string | null {
    return this.interaction.guildId;
  }
  get channel(): TextChannel | null {
    return this.interaction.channel as TextChannel | null;
  }
  get channelId(): string | null {
    return this.interaction.channelId;
  }
  get user(): User {
    return this.interaction.user;
  }
  get userId(): string {
    return this.interaction.user.id;
  }
  get member(): GuildMember | null {
    return this.interaction.member as GuildMember | null;
  }
  get voiceChannel(): VoiceChannel | null {
    return this.member?.voice?.channel as VoiceChannel | null;
  }
  get voiceChannelId(): string | null | undefined {
    return this.member?.voice?.channelId;
  }
  get author(): User {
    return this.user;
  }

  getOption(
    name: string,
    type: OptionType = 'string',
  ): string | number | boolean | User | Channel | any | null {
    if (!this.options) return null;

    switch (type) {
      case 'string':
        return this.options.getString(name);
      case 'integer':
        return this.options.getInteger(name);
      case 'boolean':
        return this.options.getBoolean(name);
      case 'user':
        return this.options.getUser(name);
      case 'channel':
        return this.options.getChannel(name) as Channel | null;
      case 'role':
        return this.options.getRole(name);
      case 'number':
        return this.options.getNumber(name);
      case 'attachment':
        return this.options.getAttachment(name);
      default:
        return this.options.get(name)?.value ?? null;
    }
  }

  async reply(
    content: string | InteractionReplyOptions | MessagePayload,
  ): Promise<InteractionResponse | Message> {
    if (this.interaction.deferred || this.interaction.replied) {
      return await this.interaction.editReply(
        content as string | MessagePayload | InteractionEditReplyOptions,
      );
    }
    return await this.interaction.reply(content as InteractionReplyOptions);
  }

  async defer(
    ephemeral: boolean = false,
  ): Promise<InteractionResponse | Message> {
    if (!this.interaction.deferred && !this.interaction.replied) {
      return await this.interaction.deferReply({ ephemeral });
    }
    return await this.interaction.fetchReply();
  }

  async editReply(
    content: string | InteractionEditReplyOptions | MessagePayload,
  ): Promise<Message> {
    return await this.interaction.editReply(content);
  }
}

// ============ MESSAGE CONTEXT (Prefix commands) ============

export class MessageContext extends BaseContext {
  private message: Message;
  private parsedOptions: Map<string, string> | null = null;
  private mainText: string | null = null;

  constructor(message: Message, commandName: string | null = null) {
    super(message.client, commandName);
    this.message = message;
    this._parseMessageOptions();
  }

  private _parseMessageOptions(): void {
    const content = this.message.content;
    if (!content || typeof content !== 'string') return;

    const parts = content.split(' ').slice(1);
    this.parsedOptions = new Map();
    const textParts: string[] = [];

    for (const part of parts) {
      const colonIndex = part.indexOf(':');
      if (colonIndex > 0 && colonIndex < part.length - 1) {
        const key = part.substring(0, colonIndex);
        const value = part.substring(colonIndex + 1);
        this.parsedOptions.set(key.toLowerCase(), value);
      } else {
        textParts.push(part);
      }
    }

    this.mainText = textParts.join(' ') || null;
  }

  get guild(): Guild | null {
    return this.message.guild;
  }
  get guildId(): string | null {
    return this.message.guildId;
  }
  get channel(): TextChannel | null {
    return this.message.channel as TextChannel | null;
  }
  get channelId(): string | null {
    return this.message.channelId;
  }
  get user(): User {
    return this.message.author;
  }
  get userId(): string {
    return this.message.author.id;
  }
  get member(): GuildMember | null {
    return this.message.member;
  }
  get voiceChannel(): VoiceChannel | null {
    return this.member?.voice?.channel as VoiceChannel | null;
  }
  get voiceChannelId(): string | null | undefined {
    return this.member?.voice?.channelId;
  }
  get author(): User {
    return this.user;
  }

  getOption(
    name: string,
    type: OptionType = 'string',
  ): string | number | boolean | User | Channel | any | null {
    const optionValue = this.parsedOptions?.get(name.toLowerCase());

    if (optionValue !== undefined) {
      return this._convertOptionValue(optionValue, type);
    }

    // Fallback for common text-based option names
    switch (name.toLowerCase()) {
      case 'query':
      case 'input':
      case 'keyword':
      case 'search':
        return this.mainText;
      default:
        return null;
    }
  }

  private _convertOptionValue(
    value: string,
    type: OptionType,
  ): string | number | boolean | User | Channel | any | null {
    switch (type) {
      case 'integer': {
        const num = Number.parseInt(value, 10);
        return Number.isNaN(num) ? null : num;
      }
      case 'boolean': {
        const lv = value.toLowerCase();
        if (lv === 'true' || lv === '1' || lv === 'yes') return true;
        if (lv === 'false' || lv === '0' || lv === 'no') return false;
        return null;
      }
      case 'user': {
        const match = value.match(/<@!?(\d+)>/);
        return match ? (this.client.users.cache.get(match[1]) ?? null) : null;
      }
      case 'channel': {
        const match = value.match(/<#(\d+)>/);
        return match
          ? (this.client.channels.cache.get(match[1]) ?? null)
          : null;
      }
      case 'role': {
        const match = value.match(/<@&(\d+)>/);
        return match
          ? (this.message.guild?.roles.cache.get(match[1]) ?? null)
          : null;
      }
      case 'number': {
        const num = Number.parseFloat(value);
        return Number.isNaN(num) ? null : num;
      }
      case 'attachment':
        return null; // Not typically supported in simple prefix parsing
      case 'string':
      default:
        return value;
    }
  }

  async reply(
    content: string | BaseMessageOptions | MessagePayload,
  ): Promise<Message> {
    return await this.message.reply(content);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async defer(_ephemeral: boolean = false): Promise<Message> {
    return await this.message.reply({ content: 'ㅤ' });
  }

  async editReply(
    content: string | BaseMessageOptions | MessagePayload,
  ): Promise<Message> {
    try {
      const messages = await this.message.channel.messages.fetch({ limit: 5 });
      const botReply = messages.find(
        (msg) =>
          msg.author.id === this.client.user?.id &&
          msg.reference?.messageId === this.message.id,
      );

      if (botReply) {
        return await botReply.edit(content);
      }

      if (!this.message.channel || !('send' in this.message.channel)) {
        throw new Error('Channel does not support sending messages');
      }
      return await this.message.channel.send(content);
    } catch (error) {
      if (!this.message.channel || !('send' in this.message.channel)) {
        throw error;
      }
      return await this.message.channel.send(content);
    }
  }
}

// ============ CONTEXT ADAPTER (Facade) ============

export function createContext(
  source: InteractionSource | Message,
  commandName?: string,
): BaseContext {
  if (
    'isChatInputCommand' in source &&
    (source.isChatInputCommand?.() ||
      ('isButton' in source && source.isButton?.()) ||
      ('isStringSelectMenu' in source && source.isStringSelectMenu?.()))
  ) {
    return new InteractionContext(source);
  }
  return new MessageContext(source as Message, commandName);
}

export class ContextAdapter extends BaseContext {
  private context: BaseContext;
  public readonly isInteraction: boolean;
  public readonly isMessage: boolean;

  constructor(source: InteractionSource | Message, commandName?: string) {
    const ctx = createContext(source, commandName);
    super(ctx.client, ctx.commandName);
    this.context = ctx;
    this.isInteraction = ctx instanceof InteractionContext;
    this.isMessage = ctx instanceof MessageContext;
  }

  get guild() {
    return this.context.guild;
  }
  get guildId() {
    return this.context.guildId;
  }
  get channel() {
    return this.context.channel;
  }
  get channelId() {
    return this.context.channelId;
  }
  get user() {
    return this.context.user;
  }
  get userId() {
    return this.context.userId;
  }
  get member() {
    return this.context.member;
  }
  get voiceChannel() {
    return this.context.voiceChannel;
  }
  get voiceChannelId() {
    return this.context.voiceChannelId;
  }
  get author() {
    return this.context.author;
  }

  getOption(name: string, type?: OptionType) {
    return this.context.getOption(name, type);
  }

  async reply(content: string | InteractionReplyOptions | MessagePayload) {
    return await this.context.reply(content);
  }

  async defer(ephemeral?: boolean) {
    return await this.context.defer(ephemeral);
  }

  async editReply(content: string | InteractionReplyOptions | MessagePayload) {
    return await this.context.editReply(content);
  }
}
