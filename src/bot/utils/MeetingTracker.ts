import { Client, VoiceChannel, GuildMember, TextChannel } from 'discord.js';

export interface MeetingParticipant {
  userId: string;
  displayName: string;
  tag: string;
  joinedAt: number;
  leftAt: number | null;
  totalDuration: number;
  sessions: SessionPeriod[];
}

export interface SessionPeriod {
  joinedAt: number;
  leftAt: number | null;
}

export interface MeetingSession {
  sessionId: string;
  guildId: string;
  voiceChannelId: string;
  textChannelId: string;
  initiatorId: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  participants: Map<string, MeetingParticipant>;
  timeout: NodeJS.Timeout | null;
}

export class MeetingTracker {
  private sessions: Map<string, MeetingSession>;
  private client: Client;

  constructor(client: Client) {
    this.sessions = new Map();
    this.client = client;
  }

  createSession(
    voiceChannelId: string,
    textChannelId: string,
    initiator: GuildMember,
    durationMinutes: number
  ): MeetingSession {
    const guildId = initiator.guild.id;
    
    const existingSession = this.getSessionByVoiceChannel(guildId, voiceChannelId);
    if (existingSession) {
      throw new Error('This voice channel already has an active tracking session');
    }

    const sessionId = `${guildId}-${voiceChannelId}-${Date.now()}`;
    const startTime = Date.now();
    const duration = durationMinutes * 60 * 1000;

    const session: MeetingSession = {
      sessionId,
      guildId,
      voiceChannelId,
      textChannelId,
      initiatorId: initiator.id,
      startTime,
      endTime: null,
      duration,
      participants: new Map(),
      timeout: null
    };

    this.sessions.set(voiceChannelId, session);
    return session;
  }

  addParticipant(voiceChannelId: string, member: GuildMember): void {
    const session = this.sessions.get(voiceChannelId);
    if (!session) return;

    const existing = session.participants.get(member.id);
    const now = Date.now();

    if (existing) {
      existing.sessions.push({
        joinedAt: now,
        leftAt: null
      });
    } else {
      session.participants.set(member.id, {
        userId: member.id,
        displayName: member.displayName,
        tag: member.user.tag,
        joinedAt: now,
        leftAt: null,
        totalDuration: 0,
        sessions: [{
          joinedAt: now,
          leftAt: null
        }]
      });
    }
  }

  removeParticipant(voiceChannelId: string, userId: string): void {
    const session = this.sessions.get(voiceChannelId);
    if (!session) return;

    const participant = session.participants.get(userId);
    if (!participant) return;

    const now = Date.now();
    const lastSession = participant.sessions[participant.sessions.length - 1];
    
    if (lastSession && lastSession.leftAt === null) {
      lastSession.leftAt = now;
      const sessionDuration = now - lastSession.joinedAt;
      participant.totalDuration += sessionDuration;
      participant.leftAt = now;
    }
  }

  initializeCurrentParticipants(voiceChannelId: string, members: GuildMember[]): void {
    const session = this.sessions.get(voiceChannelId);
    if (!session) return;

    const now = Date.now();
    
    for (const member of members) {
      if (member.user.bot) continue;
      
      session.participants.set(member.id, {
        userId: member.id,
        displayName: member.displayName,
        tag: member.user.tag,
        joinedAt: now,
        leftAt: null,
        totalDuration: 0,
        sessions: [{
          joinedAt: now,
          leftAt: null
        }]
      });
    }
  }

  async endSession(voiceChannelId: string): Promise<MeetingSession | null> {
    const session = this.sessions.get(voiceChannelId);
    if (!session) return null;

    if (session.timeout) {
      clearTimeout(session.timeout);
    }

    const now = Date.now();
    session.endTime = now;

    for (const participant of session.participants.values()) {
      const lastSession = participant.sessions[participant.sessions.length - 1];
      if (lastSession && lastSession.leftAt === null) {
        lastSession.leftAt = now;
        const sessionDuration = now - lastSession.joinedAt;
        participant.totalDuration += sessionDuration;
        participant.leftAt = now;
      }
    }

    this.sessions.delete(voiceChannelId);
    return session;
  }

  setAutoEnd(voiceChannelId: string, callback: () => Promise<void>): void {
    const session = this.sessions.get(voiceChannelId);
    if (!session) return;

    session.timeout = setTimeout(() => {
      callback().catch(console.error);
    }, session.duration);
  }

  getSession(voiceChannelId: string): MeetingSession | undefined {
    return this.sessions.get(voiceChannelId);
  }

  getSessionByVoiceChannel(guildId: string, voiceChannelId: string): MeetingSession | undefined {
    return this.sessions.get(voiceChannelId);
  }

  getAllSessions(): MeetingSession[] {
    return Array.from(this.sessions.values());
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
