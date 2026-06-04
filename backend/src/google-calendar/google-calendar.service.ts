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

export interface GoogleHealth {
  ok: boolean;
  reason?: string;
  account?: string;
}

const SCOPE = 'https://www.googleapis.com/auth/calendar';
const ACCOUNT = 'asositllm'; // yagona Google akkaunt — barcha Meet shu kalendarda yaratiladi

/**
 * Google Calendar orqali har bir yig'ilishga Google Meet havolasini biriktiradi.
 * Yagona `asositllm@gmail.com` akkaunti ishlatiladi (refresh_token .env'dan olinadi);
 * googleapis access-tokenni avtomatik yangilaydi. Calendar event vaqtga bog'langan
 * Meet beradi (Meet createSpace EMAS).
 *
 * Maxfiy kalitlar FAQAT .env'da — kodda hardcode YO'Q.
 * Yangi env nomlari (eski nomlarga fallback bilan, eski deploy buzilmasin):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
 *   GOOGLE_REFRESH_TOKEN        (eski: GOOGLE_REFRESH_TOKEN_ASOSITLLM)
 *   GOOGLE_CALENDAR_ID          (standart: 'primary')
 *   GOOGLE_MEET_TIMEZONE        (eski: GOOGLE_TIMEZONE; standart: 'Asia/Tashkent')
 */
@Injectable()
export class GoogleCalendarService {
  private readonly logger = new Logger('GoogleCalendar');
  private client: OAuth2Client | null = null;
  private readonly defaultTz: string;
  private readonly calendarId: string;

  constructor(private readonly config: ConfigService) {
    this.defaultTz =
      this.config.get<string>('GOOGLE_MEET_TIMEZONE') ||
      this.config.get<string>('GOOGLE_TIMEZONE') ||
      'Asia/Tashkent';
    this.calendarId = this.config.get<string>('GOOGLE_CALENDAR_ID') || 'primary';
    this.register();
  }

  /** OAuth2 klientini { clientId, clientSecret, redirectUri, refreshToken } dan tuzadi. */
  private register() {
    const refreshToken =
      this.config.get<string>('GOOGLE_REFRESH_TOKEN') ||
      this.config.get<string>('GOOGLE_REFRESH_TOKEN_ASOSITLLM');
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri =
      this.config.get<string>('GOOGLE_REDIRECT_URI') || 'https://developers.google.com/oauthplayground';

    if (!refreshToken || !clientId || !clientSecret) {
      this.logger.warn(`Google akkaunt '${ACCOUNT}' sozlanmagan (.env to'liq emas) — Meet havolasi yaratilmaydi.`);
      return;
    }
    const oauth = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    oauth.setCredentials({ refresh_token: refreshToken, scope: SCOPE });

    // Access-token avtomatik yangilanganda loglaymiz (yangi refresh_token kelsa ham ko'rsatamiz).
    oauth.on('tokens', (tokens) => {
      if (tokens.access_token) {
        const exp = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'noma\'lum';
        this.logger.log(`Google '${ACCOUNT}' access-token yangilandi (amal qiladi: ${exp}).`);
      }
      if (tokens.refresh_token) {
        this.logger.warn(`Google '${ACCOUNT}' YANGI refresh_token berdi — .env'dagi GOOGLE_REFRESH_TOKEN ni yangilang.`);
      }
    });

    this.client = oauth;
    this.logger.log(`Google akkaunt '${ACCOUNT}' sozlandi (kalendar: ${this.calendarId}, TZ: ${this.defaultTz}).`);
  }

  /** Akkaunt sozlanganmi (refresh_token + client bormi). */
  isConfigured(): boolean {
    return this.client !== null;
  }

  private getClient(): OAuth2Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        `Google Meet sozlanmagan: ulanishni administrator .env orqali sozlashi kerak.`,
      );
    }
    return this.client;
  }

  private calendar() {
    return google.calendar({ version: 'v3', auth: this.getClient() });
  }

  /**
   * Token sog'ligini tekshiradi (calendarList.list). Token muammosini erta bilish uchun.
   * Hech qachon throw qilmaydi — { ok, reason } qaytaradi.
   */
  async checkHealth(): Promise<GoogleHealth> {
    if (!this.client) {
      return { ok: false, reason: 'Google .env sozlanmagan (GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN to\'liq emas).', account: ACCOUNT };
    }
    try {
      const cal = this.calendar();
      await cal.calendarList.list({ maxResults: 1 });
      return { ok: true, account: ACCOUNT };
    } catch (e: any) {
      return { ok: false, reason: this.describeError(e), account: ACCOUNT };
    }
  }

  /** Belgilangan vaqtga Calendar event + Google Meet yaratadi. Ishtirokchi/taklif yo'q. */
  async createMeetEvent(input: CreateMeetInput): Promise<MeetEventResult> {
    const cal = this.calendar();
    const timeZone = input.timeZone || this.defaultTz;
    try {
      const res = await cal.events.insert({
        calendarId: this.calendarId,
        conferenceDataVersion: 1, // SHART — busiz Meet link yaratilmaydi
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
      const res = await cal.events.patch({ calendarId: this.calendarId, eventId: googleEventId, requestBody });
      return { googleEventId: res.data.id as string, meetLink: res.data.hangoutLink ?? null };
    } catch (e) {
      this.handleError(e, 'yangilash');
    }
  }

  /** Eventni (va Meet'ni) bekor qiladi/o'chiradi. Allaqachon yo'q bo'lsa — jim o'tadi. */
  async cancelMeetEvent(googleEventId: string): Promise<void> {
    const cal = this.calendar();
    try {
      await cal.events.delete({ calendarId: this.calendarId, eventId: googleEventId });
    } catch (e: any) {
      const code = e?.code || e?.response?.status;
      if (code === 404 || code === 410) return; // allaqachon o'chirilgan
      this.handleError(e, "o'chirish");
    }
  }

  /** Xatoni toza o'zbekcha matnga aylantiradi (log/health uchun). */
  private describeError(e: any): string {
    const apiMsg = e?.response?.data?.error?.message || e?.response?.data?.error_description || e?.message || 'noma\'lum xato';
    const raw = `${e?.message || ''} ${JSON.stringify(e?.response?.data || '')}`;
    const code = e?.code || e?.response?.status;
    if (raw.includes('invalid_grant') || /expired|revoked/i.test(raw) || code === 401) {
      return 'Ulanishni yangilash kerak (refresh_token eskirgan yoki bekor qilingan).';
    }
    if (code === 403) {
      return `Ruxsat yo'q (403): ${apiMsg}`;
    }
    return apiMsg;
  }

  private handleError(e: any, action: string): never {
    const raw = `${e?.message || ''} ${JSON.stringify(e?.response?.data || '')}`;
    const code = e?.code || e?.response?.status;
    // 1) Refresh token muammosi (invalid_grant / expired / revoked / 401)
    if (raw.includes('invalid_grant') || /expired|revoked/i.test(raw) || code === 401) {
      this.logger.error(`GOOGLE_REFRESH_TOKEN ishlamayapti, yangilash kerak (akkaunt '${ACCOUNT}').`);
      throw new ServiceUnavailableException(
        'Google Meet havolasi yaratilmadi: ulanishni yangilash kerak. Administratorga murojaat qiling.',
      );
    }
    // 2) Ruxsat (403) yoki tarmoq/boshqa xato — alohida toza xabar
    const apiMsg = this.describeError(e);
    this.logger.error(`Google Meet ${action} xato: ${apiMsg}`);
    if (code === 403) {
      throw new BadGatewayException(`Google Meet ${action} muvaffaqiyatsiz: ruxsat yo'q (403). Administratorga murojaat qiling.`);
    }
    throw new BadGatewayException(`Google Meet ${action} muvaffaqiyatsiz: ${apiMsg}`);
  }
}
