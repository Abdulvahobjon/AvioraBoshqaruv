/*
 * Bir martalik: Google Calendar API uchun refresh_token olish (AVTOMATIK).
 * Har bir akkaunt uchun ALOHIDA ishga tushiring (brauzerda kerakli akkaunt bilan kiring).
 *
 *   cd backend
 *   node scripts/google-oauth.js
 *
 * Talab: .env da GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI to'ldirilgan bo'lishi.
 * GOOGLE_REDIRECT_URI portida skript vaqtincha server ko'taradi va `code`ni avtomatik tutib oladi.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const http = require('http');
const { URL } = require('url');
const { google } = require('googleapis');

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5050/oauth2callback';

if (!clientId || !clientSecret) {
  console.error("❌ .env da GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to'ldirilmagan.");
  process.exit(1);
}

const cb = new URL(redirectUri);
const port = cb.port || 80;
const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // refresh_token har safar qaytishi uchun majburiy
  scope: ['https://www.googleapis.com/auth/calendar.events'],
});

const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith(cb.pathname)) { res.writeHead(404); res.end(); return; }
  const code = new URL(req.url, redirectUri).searchParams.get('code');
  if (!code) { res.writeHead(400); res.end('code yo\'q'); return; }
  try {
    const { tokens } = await oauth2.getToken(code);
    const html = (msg, ok) => `<html><body style="font-family:sans-serif;text-align:center;padding:60px"><h2 style="color:${ok ? '#16a34a' : '#dc2626'}">${msg}</h2><p>Terminalga qayting.</p></body></html>`;
    if (!tokens.refresh_token) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html('refresh_token qaytmadi', false));
      console.error('\n⚠️  refresh_token qaytmadi. https://myaccount.google.com/permissions dan ilovani olib tashlab, qayta urinib ko\'ring.');
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html('✅ Muvaffaqiyatli!', true));
      console.log('\n✅ REFRESH_TOKEN:\n');
      console.log(tokens.refresh_token);
      console.log('\nShu qiymatni .env ga qo\'ying:');
      console.log('  • asositllm@gmail.com      →  GOOGLE_REFRESH_TOKEN_ASOSITLLM');
      console.log('  • abdulvahob0714@gmail.com →  GOOGLE_REFRESH_TOKEN_ABDULVAHOB\n');
    }
  } catch (e) {
    res.writeHead(500); res.end('Xato: ' + (e.message || ''));
    console.error('\n❌ Xato:', e?.response?.data || e.message);
  } finally {
    setTimeout(() => { server.close(); process.exit(0); }, 500);
  }
});

server.listen(port, () => {
  console.log('\n1) Quyidagi havolani brauzerda oching va KERAKLI Google akkaunt bilan kiring:\n');
  console.log(authUrl);
  console.log('\n2) Ruxsat bering — `code` avtomatik tutib olinadi, terminalda refresh_token chiqadi.');
  console.log(`   (Bu skript ${redirectUri} manzilida vaqtincha server ko'tardi.)\n`);
});
