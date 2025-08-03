import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionGuard } from './guards/permission.guard';
import { User, UserSchema } from '../database/schemas/user.schema';
import { Tenant, TenantSchema } from '../database/schemas/tenant.schema';
import {
  UserGroupEntity,
  UserGroupSchema,
} from '../database/schemas/user-group.schema';
import { TenantIdService } from './services/tenant-id.service';
import { UserGroupIdService } from './services/user-group-id.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Tenant.name, schema: TenantSchema },
      { name: UserGroupEntity.name, schema: UserGroupSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    PermissionGuard,
    TenantIdService,
    UserGroupIdService,
  ],
  exports: [AuthService, JwtAuthGuard, PermissionGuard],
})
export class AuthModule {}
