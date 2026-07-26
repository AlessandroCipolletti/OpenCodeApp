import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  const webPort = process.env.WEB_PORT ?? '3000';
  const frontendUrl = process.env.FRONTEND_URL ?? `http://localhost:${webPort}`;
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  const port = parseInt(process.env.API_PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
  console.log(`CORS origin: ${frontendUrl}`);
}

bootstrap();
