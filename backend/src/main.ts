import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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

  // Static serving for uploaded task files: /uploads/<file>
  const uploadDir = config.get<string>('UPLOAD_DIR', 'uploads');
  if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), uploadDir), { prefix: '/uploads/' });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', 'http://localhost:5173'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Swagger ──
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Aviora Boshqaruv API')
    .setDescription('IT firma ichki boshqaruv tizimi — REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 Backend: http://localhost:${port}/api`);
  console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
