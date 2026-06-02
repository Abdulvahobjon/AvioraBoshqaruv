import { Injectable, Logger, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';

export type GoogleAccountKey = 'asositllm' | 'abdulvahob';

export interface CreateMeetInput {
  account?: GoogleAccountKey;
  title: string;
  description?: string;
  startISO: string; // ISO 8601 datetime
  endISO: string;   // ISO 8601 datetime
  timeZone?: string;
}

export interface MeetEventResult {
  googleEventId: string;
  meetLink: string | null;
  account: GoogleAccountKey;
}

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

/**
 * Google Calendar orqali har bir yig'ilishga Google Meet havolasini biriktiradi.
 * Har akkaunt uchun o'z OAuth2 klienti (refresh_token preset) saqlanadi; googleapis
 * access-tokenni avtomatik yangilaydi. Calendar event vaqtga bog'langan Meet beradi
 * (Meet createSpace EMAS).
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger('GoogleCalendar');
  private readonly clients = new Map<GoogleAccountKey, OAuth2Client>();
  private readonly defaultTz: string;

  constructor(private readonly config: ConfigService) {
    this.defaultTz = this.config.get<string>('GOOGLE_TIMEZONE', 'Asia/Tashkent');
    this.register('asositllm', 'GOOGLE_REFRESH_TOKEN_ASOSITLLM');
    this.register('abdulvahob', 'GOOGLE_REFRESH_TOKEN_ABDULVAHOB');
  }

  /** Registry: akkaunt kalitini { clientId, clientSecret, redirectUri, refreshToken } ga bog'laydi. */
  private register(key: GoogleAccountKey, refreshEnv: string) {
    const refreshToken = this.config.get<string>(refreshEnv);
    const upper = key.toUpperCase();
    const clientId = this.config.get<string>(`GOOGLE_CLIENT_ID_${upper}`) || this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>(`GOOGLE_CLIENT_SECRET_${upper}`) || this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI') || 'http://localhost:3000/oauth2callback';

    if (!refreshToken || !clientId || !clientSecret) {
      this.logger.warn(`Google akkaunt '${key}' sozlanmagan (.env to'liq emas) — bu akkauntda Meet havolasi yaratilmaydi.`);
      return;
    }
    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth.setCredentials({ refresh_token: refreshToken, scope: SCOPE });
    this.clients.set(key, oauth);
    this.logger.log(`Google akkaunt '${key}' sozlandi.`);
  }

  /** Akkaunt sozlanganmi (refresh_token + client bormi). */
  isConfigured(account: GoogleAccountKey = 'asositllm'): boolean {
    return this.clients.has(account);
  }

  private getClient(account: GoogleAccountKey): OAuth2Client {
    const c = this.clients.get(account);
    if (!c) throw new ServiceUnavailableException(`Google akkaunt '${account}' sozlanmagan`);
    return c;
  }

  private calendar(account: GoogleAccountKey) {
    return google.calendar({ version: 'v3', auth: this.getClient(account) });
  }

  /** Belgilangan vaqtga Calendar event + Google Meet yaratadi. Ishtirokchi/taklif yo'q. */
  async createMeetEvent(input: CreateMeetInput): Promise<MeetEventResult> {
    const account = input.account || 'asositllm';
    const cal = this.calendar(account);
    const timeZone = input.timeZone || this.defaultTz;
    try {
      const res = await cal.events.insert({
        calendarId: 'primary',
        conferenceDataVersion: 1,
        requestBody: {
          summary: input.title,
          description: input.description,
          start: { dateTime: input.startISO, timeZone },
          end: { dateTime: input.endISO, timeZone },
          conferenceData: {
            createRequest: {
              requestId: randomUUID(),
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
        // attendees yo'q, sendUpdates yo'q — taklif yuborilmaydi
      });
      return { googleEventId: res.data.id as string, meetLink: res.data.hangoutLink ?? null, account };
    } catch (e) {
      this.handleError(e, account, 'yaratish');
    }
  }

  /** Mavjud eventni yangilaydi (vaqt/nomi o'zgarsa). */
  async updateMeetEvent(
    account: GoogleAccountKey,
    googleEventId: string,
    changes: { title?: string; description?: string; startISO?: string; endISO?: string; timeZone?: string },
  ): Promise<{ googleEventId: string; meetLink: string | null }> {
    const cal = this.calendar(account);
    const timeZone = changes.timeZone || this.defaultTz;
    try {
      const requestBody: any = {};
      if (changes.title !== undefined) requestBody.summary = changes.title;
      if (changes.description !== undefined) requestBody.description = changes.description;
      if (changes.startISO) requestBody.start = { dateTime: changes.startISO, timeZone };
      if (changes.endISO) requestBody.end = { dateTime: changes.endISO, timeZone };
      const res = await cal.events.patch({ calendarId: 'primary', eventId: googleEventId, requestBody });
      return { googleEventId: res.data.id as string, meetLink: res.data.hangoutLink ?? null };
    } catch (e) {
      this.handleError(e, account, 'yangilash');
    }
  }

  /** Eventni (va Meet'ni) bekor qiladi/o'chiradi. Allaqachon yo'q bo'lsa — jim o'tadi. */
  async cancelMeetEvent(account: GoogleAccountKey, googleEventId: string): Promise<void> {
    const cal = this.calendar(account);
    try {
      await cal.events.delete({ calendarId: 'primary', eventId: googleEventId });
    } catch (e: any) {
      const code = e?.code || e?.response?.status;
      if (code === 404 || code === 410) return; // allaqachon o'chirilgan
      this.handleError(e, account, "o'chirish");
    }
  }

  private handleError(e: any, account: GoogleAccountKey, action: string): never {
    const apiMsg = e?.response?.data?.error?.message || e?.response?.data?.error_description || e?.message || 'noma\'lum xato';
    const raw = `${e?.message || ''} ${JSON.stringify(e?.response?.data || '')}`;
    if (raw.includes('invalid_grant')) {
      this.logger.error(`Google '${account}' refresh_token yaroqsiz/eskirgan — qayta token oling.`);
      throw new ServiceUnavailableException(`Google akkaunt '${account}' avtorizatsiyasi eskirgan — refresh_token ni yangilang`);
    }
    this.logger.error(`Google Meet ${action} xato (${account}): ${apiMsg}`);
    throw new BadGatewayException(`Google Meet ${action} muvaffaqiyatsiz: ${apiMsg}`);
  }
}
