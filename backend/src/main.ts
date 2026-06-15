import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

// ── BigInt JSON serialization (amounts are stored as BigInt = tiyin) ──
// Without this, JSON.stringify throws on BigInt.
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const isProd = config.get<string>('NODE_ENV') === 'production';

  // Xavfsizlik header'lari (HSTS, X-Content-Type-Options, frameguard, ...).
  // crossOriginResourcePolicy o'chirilgan — /uploads fayllarini front-end (boshqa origin) ko'rsata olishi uchun.
  app.use(helmet({ crossOriginResourcePolicy: false }));

  // Static serving for uploaded task files: /uploads/<file>
  const uploadDir = config.get<string>('UPLOAD_DIR', 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), uploadDir), {
    prefix: '/uploads/',
    // Yuklangan fayllar brauzerda INLINE ochilmasin (sniffing/stored-XSS himoyasi) —
    // har doim yuklab olinadi, MIME ham qat'iy (nosniff).
    setHeaders: (res: any) => {
      res.set('Content-Disposition', 'attachment');
      res.set('X-Content-Type-Options', 'nosniff');
    },
  });

  app.setGlobalPrefix('api');
  // CORS_ORIGIN — vergul bilan ajratilgan ANIQ ro'yxat (wildcard yo'q).
  // Yangi front-end manzili bo'lsa, uni CORS_ORIGIN ga qo'shing.
  const corsEnv = config.get<string>('CORS_ORIGIN', 'http://localhost:5173');
  const allowedOrigins = corsEnv.split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({
    origin: (origin, callback) => {
      // origin yo'q (Postman/server-to-server) yoki aniq ro'yxatda bo'lsa ruxsat.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true, // DTO'da yo'q maydon kelsa 400 — mass-assignment yuzasini yopadi
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Swagger — faqat NOL-production muhitda (productionda API sxemasi oshkor bo'lmasligi uchun) ──
  if (!isProd) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Aviora Boshqaruv API')
      .setDescription('IT firma ichki boshqaruv tizimi — REST API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 Backend: http://localhost:${port}/api`);
  if (!isProd) console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
