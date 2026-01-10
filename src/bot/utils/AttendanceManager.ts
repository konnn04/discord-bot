import { Client, GuildMember, EmbedBuilder, Colors } from 'discord.js';

export interface AttendanceSession {
    sessionId: string;
    messageId: string;
    creatorId: string;
    guildId: string;
    channelId: string;
    title: string;
    startTime: number;
    endTime: number;
    duration: number; // in seconds
    question: string | null;
    answer: string | null;
    attendees: Map<string, AttendeeData>;
    timeout: NodeJS.Timeout | null;
}

export interface AttendeeData {
    userId: string;
    displayName: string;
    tag: string;
    timestamp: number;
}

export class AttendanceManager {
    private sessions: Map<string, AttendanceSession>; // messageId -> session
    private client: Client;

    constructor(client: Client) {
        this.sessions = new Map();
        this.client = client;
    }

    /**
     * Create new attendance session
     */
    createSession(
        messageId: string,
        creator: GuildMember,
        channelId: string,
        title: string,
        durationSeconds: number,
        question: string | null = null,
        answer: string | null = null
    ): AttendanceSession {
        const guildId = creator.guild.id;

        // Check if user already has an active session in this guild
        const existingSession = this.findSessionByCreator(guildId, creator.id);
        if (existingSession) {
            throw new Error('You already have an active attendance session!');
        }

        const sessionId = `${guildId}-${creator.id}-${Date.now()}`;
        const startTime = Date.now();
        const endTime = startTime + (durationSeconds * 1000);

        const session: AttendanceSession = {
            sessionId,
            messageId,
            creatorId: creator.id,
            guildId,
            channelId,
            title: title.trim(),
            startTime,
            endTime,
            duration: durationSeconds,
            question: question?.trim() || null,
            answer: answer?.trim() || null,
            attendees: new Map(),
            timeout: null
        };

        this.sessions.set(messageId, session);
        return session;
    }

    /**
     * Add attendee to session
     */
    addAttendee(messageId: string, member: GuildMember, answerProvided: string | null = null): boolean {
        const session = this.sessions.get(messageId);
        if (!session) {
            throw new Error('Attendance session not found!');
        }

        // Check if already attended
        if (session.attendees.has(member.id)) {
            return false; // Already attended
        }

        // Verify answer if question exists
        if (session.question && session.answer) {
            if (!answerProvided || answerProvided.trim().toLowerCase() !== session.answer.toLowerCase()) {
                throw new Error('Incorrect answer!');
            }
        }

        // Add attendee
        session.attendees.set(member.id, {
            userId: member.id,
            displayName: member.displayName,
            tag: member.user.tag,
            timestamp: Date.now()
        });

        return true;
    }

    /**
     * End session and generate reports
     */
    async endSession(messageId: string): Promise<{
        session: AttendanceSession;
        attendeeList: string;
        attendeeCount: number;
    }> {
        const session = this.sessions.get(messageId);
        if (!session) {
            throw new Error('Attendance session not found!');
        }

        // Clear timeout
        if (session.timeout) {
            clearTimeout(session.timeout);
        }

        // Generate attendee list
        const attendees = Array.from(session.attendees.values());
        const attendeeCount = attendees.length;

        let attendeeList = '';
        if (attendeeCount === 0) {
            attendeeList = '*No one attended*';
        } else {
            for (const attendee of attendees) {
                attendeeList += `• **${attendee.displayName}** (@${attendee.tag}) - <t:${Math.floor(attendee.timestamp / 1000)}:R>\n`;
            }
        }

        // Remove session
        this.sessions.delete(messageId);

        return { session, attendeeList, attendeeCount };
    }

    /**
     * Set auto-end timeout for session
     */
    setAutoEnd(messageId: string, callback: () => Promise<void>): void {
        const session = this.sessions.get(messageId);
        if (!session) return;

        const duration = session.duration * 1000;
        session.timeout = setTimeout(() => {
            callback().catch(console.error);
        }, duration);
    }

    /**
     * Get session by message ID
     */
    getSession(messageId: string): AttendanceSession | undefined {
        return this.sessions.get(messageId);
    }

    /**
     * Find session by creator in guild
     */
    findSessionByCreator(guildId: string, creatorId: string): AttendanceSession | undefined {
        return Array.from(this.sessions.values())
            .find(s => s.guildId === guildId && s.creatorId === creatorId);
    }

    /**
     * Get all sessions for a guild
     */
    getGuildSessions(guildId: string): AttendanceSession[] {
        return Array.from(this.sessions.values())
            .filter(s => s.guildId === guildId);
    }

    /**
     * Check if user has attended a session
     */
    hasAttended(messageId: string, userId: string): boolean {
        const session = this.sessions.get(messageId);
        return session ? session.attendees.has(userId) : false;
    }

    /**
     * Get attendee count for session
     */
    getAttendeeCount(messageId: string): number {
        const session = this.sessions.get(messageId);
        return session ? session.attendees.size : 0;
    }

    /**
     * Split long attendee list into chunks for Discord embed limits
     */
    splitAttendeeList(attendeeList: string, maxLength: number = 4000): string[] {
        if (attendeeList.length <= maxLength) {
            return [attendeeList];
        }

        const chunks: string[] = [];
        const lines = attendeeList.split('\n');
        let currentChunk = '';

        for (const line of lines) {
            if (currentChunk.length + line.length + 1 > maxLength) {
                chunks.push(currentChunk);
                currentChunk = line + '\n';
            } else {
                currentChunk += line + '\n';
            }
        }

        if (currentChunk) {
            chunks.push(currentChunk);
        }

        return chunks;
    }
}
