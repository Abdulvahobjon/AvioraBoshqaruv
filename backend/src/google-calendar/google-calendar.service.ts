import { Injectable, Logger, BadGatewayException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { randomUUID } from 'crypto';

export interface CreateMeetInput {
  title: string;
  description?: string;
  startISO: string; // ISO 8601 datetime
  endISO: string;   // ISO 8601 datetime
  timeZone?: string;
}

export interface MeetEventResult {
  googleEventId: string;
  meetLink: string | null;
}

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';
const ACCOUNT = 'asositllm'; // yagona Google akkaunt — barcha Meet shu kalendarda yaratiladi

/**
 * Google Calendar orqali har bir yig'ilishga Google Meet havolasini biriktiradi.
 * Yagona `asositllm@gmail.com` akkaunti ishlatiladi (refresh_token preset);
 * googleapis access-tokenni avtomatik yangilaydi. Calendar event vaqtga bog'langan
 * Meet beradi (Meet createSpace EMAS).
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger('GoogleCalendar');
  private client: OAuth2Client | null = null;
  private readonly defaultTz: string;

  constructor(private readonly config: ConfigService) {
    this.defaultTz = this.config.get<string>('GOOGLE_TIMEZONE', 'Asia/Tashkent');
    this.register();
  }

  /** `asositllm` akkaunti uchun OAuth2 klientini { clientId, clientSecret, redirectUri, refreshToken } dan tuzadi. */
  private register() {
    const refreshToken = this.config.get<string>('GOOGLE_REFRESH_TOKEN_ASOSITLLM');
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('GOOGLE_REDIRECT_URI') || 'http://localhost:5050/oauth2callback';

    if (!refreshToken || !clientId || !clientSecret) {
      this.logger.warn(`Google akkaunt '${ACCOUNT}' sozlanmagan (.env to'liq emas) — Meet havolasi yaratilmaydi.`);
      return;
    }
    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth.setCredentials({ refresh_token: refreshToken, scope: SCOPE });
    this.client = oauth;
    this.logger.log(`Google akkaunt '${ACCOUNT}' sozlandi.`);
  }

  /** Akkaunt sozlanganmi (refresh_token + client bormi). */
  isConfigured(): boolean {
    return this.client !== null;
  }

  private getClient(): OAuth2Client {
    if (!this.client) throw new ServiceUnavailableException(`Google akkaunt '${ACCOUNT}' sozlanmagan`);
    return this.client;
  }

  private calendar() {
    return google.calendar({ version: 'v3', auth: this.getClient() });
  }

  /** Belgilangan vaqtga Calendar event + Google Meet yaratadi. Ishtirokchi/taklif yo'q. */
  async createMeetEvent(input: CreateMeetInput): Promise<MeetEventResult> {
    const cal = this.calendar();
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
      return { googleEventId: res.data.id as string, meetLink: res.data.hangoutLink ?? null };
    } catch (e) {
      this.handleError(e, 'yaratish');
    }
  }

  /** Mavjud eventni yangilaydi (vaqt/nomi o'zgarsa). */
  async updateMeetEvent(
    googleEventId: string,
    changes: { title?: string; description?: string; startISO?: string; endISO?: string; timeZone?: string },
  ): Promise<{ googleEventId: string; meetLink: string | null }> {
    const cal = this.calendar();
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
      this.handleError(e, 'yangilash');
    }
  }

  /** Eventni (va Meet'ni) bekor qiladi/o'chiradi. Allaqachon yo'q bo'lsa — jim o'tadi. */
  async cancelMeetEvent(googleEventId: string): Promise<void> {
    const cal = this.calendar();
    try {
      await cal.events.delete({ calendarId: 'primary', eventId: googleEventId });
    } catch (e: any) {
      const code = e?.code || e?.response?.status;
      if (code === 404 || code === 410) return; // allaqachon o'chirilgan
      this.handleError(e, "o'chirish");
    }
  }

  private handleError(e: any, action: string): never {
    const apiMsg = e?.response?.data?.error?.message || e?.response?.data?.error_description || e?.message || 'noma\'lum xato';
    const raw = `${e?.message || ''} ${JSON.stringify(e?.response?.data || '')}`;
    if (raw.includes('invalid_grant')) {
      this.logger.error(`Google '${ACCOUNT}' refresh_token yaroqsiz/eskirgan — qayta token oling.`);
      throw new ServiceUnavailableException(`Google akkaunt '${ACCOUNT}' avtorizatsiyasi eskirgan — refresh_token ni yangilang`);
    }
    this.logger.error(`Google Meet ${action} xato: ${apiMsg}`);
    throw new BadGatewayException(`Google Meet ${action} muvaffaqiyatsiz: ${apiMsg}`);
  }
}
