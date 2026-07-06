import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { FilesystemModule } from './filesystem/filesystem.module';
import { StackModule } from './stack/stack.module';
import { ContainerModule } from './container/container.module';
import { ImageModule } from './image/image.module';
import { OllamaModule } from './ollama/ollama.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { DockerModule } from './docker/docker.module';
import { BackupModule } from './backup/backup.module';
import { VolumeModule } from './volume/volume.module';
import { RegistryModule } from './registry/registry.module';
import { DatabaseModule } from './database/database.module';
import { AiSessionModule } from './ai-session/ai-session.module';
import { StackGateway } from './gateway/stack.gateway';
import { HealthController } from './health.controller';
import { APP_FILTER } from '@nestjs/core';
import { AllExceptionsFilter } from './common/http-exception.filter';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'client', '.output', 'public'),
      exclude: ['/api/*path', '/socket.io/*path', '/api/docs/*path'],
      serveStaticOptions: { index: ['index.html'] },
    }),
    PrismaModule,
    AuthModule,
    WorkspaceModule,
    FilesystemModule,
    StackModule,
    ContainerModule,
    ImageModule,
    OllamaModule,
    DashboardModule,
    SettingsModule,
    DockerModule,
    BackupModule,
    VolumeModule,
    RegistryModule,
    DatabaseModule,
    AiSessionModule,
    CommonModule,
  ],
  controllers: [HealthController],
  providers: [
    StackGateway,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
