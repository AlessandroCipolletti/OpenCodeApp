import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );

  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle("OpenCodeApp API")
    .setDescription("Multi-tenant coding agent API")
    .setVersion("1.0")
    .addServer(`http://localhost:${process.env["PORT"] ?? 3001}`)
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env["PORT"] ?? 3001);
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📄 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap().catch(console.error);
