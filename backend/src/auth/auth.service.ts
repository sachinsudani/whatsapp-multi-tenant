import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { User } from '../database/schemas/user.schema';
import { Tenant, TenantDocument } from '../database/schemas/tenant.schema';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../database/schemas/user-group.schema';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { TenantIdService } from './services/tenant-id.service';
import { UserGroupIdService } from './services/user-group-id.service';

interface AuthenticatedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  userGroupId: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private tenantIdService: TenantIdService,
    private userGroupIdService: UserGroupIdService,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,
  ) {
    // Debug configuration loading
    console.log('JWT Secret:', this.configService.get<string>('jwt.secret'));
    console.log(
      'JWT Expires In:',
      this.configService.get<string>('jwt.expiresIn'),
    );
    console.log(
      'JWT Refresh Expires In:',
      this.configService.get<string>('jwt.refreshExpiresIn'),
    );
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.userModel
      .findOne({ email, isActive: true, isDeleted: false })
      .exec();

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Check if tenant is active
    const tenant = await this.tenantModel
      .findOne({ _id: user.tenantId, isActive: true, isDeleted: false })
      .exec();

    if (!tenant) {
      throw new UnauthorizedException('Tenant is inactive or not found');
    }

    // Check if user group is active
    const userGroup = await this.userGroupModel
      .findOne({ _id: user.userGroupId, isActive: true, isDeleted: false })
      .exec();

    if (!userGroup) {
      throw new UnauthorizedException('User group is inactive or not found');
    }

    return {
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId.toString(),
      userGroupId: user.userGroupId.toString(),
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this.userModel
      .findOne({ email: registerDto.email, isDeleted: false })
      .exec();

    if (existingUser) {
      throw new UnauthorizedException('User with this email already exists');
    }

    const tenantId = await this.tenantIdService.generateTenantId();
    const userGroupId =
      await this.userGroupIdService.generateUserGroupId(tenantId);

    // Validate tenant exists and is active
    const tenant = await this.tenantModel
      .findOne({
        _id: new Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      })
      .exec();

    if (!tenant) {
      throw new UnauthorizedException('Tenant not found or inactive');
    }

    // Validate user group exists and is active
    const userGroup = await this.userGroupModel
      .findOne({
        _id: new Types.ObjectId(userGroupId),
        isActive: true,
        isDeleted: false,
      })
      .exec();

    console.log(userGroup);
    if (!userGroup) {
      throw new UnauthorizedException('User group not found or inactive');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(registerDto.password);

    // Create new user
    const newUser = new this.userModel({
      email: registerDto.email,
      password: hashedPassword,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      phoneNumber: registerDto.phoneNumber,
      tenantId: new Types.ObjectId(tenantId),
      userGroupId: new Types.ObjectId(userGroupId),
      isActive: true,
      isEmailVerified: false,
      isDeleted: false,
    });

    const savedUser = await newUser.save();

    // Create authenticated user object
    const authenticatedUser: AuthenticatedUser = {
      id: savedUser._id.toString(),
      email: savedUser.email,
      firstName: savedUser.firstName,
      lastName: savedUser.lastName,
      tenantId: savedUser.tenantId.toString(),
      userGroupId: savedUser.userGroupId.toString(),
    };

    // Generate tokens
    const tokens = await this.generateTokens(authenticatedUser);
    const expiresIn = this.convertTimeToSeconds(
      this.configService.get<string>('jwt.expiresIn') || '1h',
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn,
      user: {
        id: savedUser._id.toString(),
        email: savedUser.email,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        tenantId: savedUser.tenantId.toString(),
        userGroupId: savedUser.userGroupId.toString(),
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    const expiresIn = this.convertTimeToSeconds(
      this.configService.get<string>('jwt.expiresIn') || '1h',
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
        userGroupId: user.userGroupId,
      },
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshTokenDto.refreshToken,
        {
          secret: this.configService.get<string>('jwt.secret'),
        },
      );

      const user = await this.userModel
        .findOne({
          _id: new Types.ObjectId(payload.sub),
          isActive: true,
          isDeleted: false,
        })
        .exec();

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const authenticatedUser: AuthenticatedUser = {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId.toString(),
        userGroupId: user.userGroupId.toString(),
      };

      const tokens = await this.generateTokens(authenticatedUser);
      const expiresIn = this.convertTimeToSeconds(
        this.configService.get<string>('jwt.expiresIn') || '1h',
      );

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn,
        user: {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          firstName: authenticatedUser.firstName,
          lastName: authenticatedUser.lastName,
          tenantId: authenticatedUser.tenantId,
          userGroupId: authenticatedUser.userGroupId,
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(userId) },
        { lastLoginAt: new Date() },
      )
      .exec();
  }

  private async generateTokens(user: AuthenticatedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      userGroupId: user.userGroupId,
      iat: Math.floor(Date.now() / 1000),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.expiresIn'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private convertTimeToSeconds(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return parseInt(timeString, 10) || 3600;
    }
  }
}
