import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';

function getBackendHost() {
  return process.env.HOST?.trim() || '0.0.0.0';
}

function getConfiguredOrigins() {
  const configured = process.env.CORS_ORIGIN || process.env.FRONTEND_ORIGIN;
  if (!configured) return null;
  return configured
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function isPrivateOrLocalHostname(hostname: string) {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
  );
}

function isAllowedOrigin(origin?: string) {
  if (!origin) return true;

  const configuredOrigins = getConfiguredOrigins();
  if (configuredOrigins) {
    return configuredOrigins.includes(origin);
  }

  try {
    const url = new URL(origin);
    return isPrivateOrLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(new RequestLoggerMiddleware().use);

  app.setGlobalPrefix('api', { exclude: ['/'] });

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Stackhand API')
    .setDescription('Personal Docker/YAML stack manager API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 4000;
  const host = getBackendHost();
  await app.listen(port, host);
  const printableHost = host === '0.0.0.0' ? '127.0.0.1' : host;
  console.log(`Stackhand backend running on http://${printableHost}:${port}`);
  console.log(`Swagger docs at http://${printableHost}:${port}/api/docs`);
}
bootstrap();
