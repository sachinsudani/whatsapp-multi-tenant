import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
        ...(configService.get<string>('database.username') && {
          user: configService.get<string>('database.username'),
          pass: configService.get<string>('database.password'),
          authSource: configService.get<string>('database.authSource'),
        }),
        maxPoolSize: 20,
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 30000,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
