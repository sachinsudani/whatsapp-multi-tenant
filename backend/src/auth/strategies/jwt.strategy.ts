import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Tenant, TenantDocument } from '../../database/schemas/tenant.schema';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../../database/schemas/user-group.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  userGroupId: string;
  iat: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'fallback-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const { sub: userId, email, tenantId, userGroupId } = payload;

    // Check if user exists and is active
    const user = await this.userModel
      .findOne({
        _id: new Types.ObjectId(userId),
        email,
        tenantId: new Types.ObjectId(tenantId),
        userGroupId: new Types.ObjectId(userGroupId),
        isActive: true,
        isDeleted: false,
      })
      .exec();

    if (!user) {
      throw new UnauthorizedException('Invalid token or user not found');
    }

    // Check if tenant is active
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

    // Check if user group is active
    const userGroup = await this.userGroupModel
      .findOne({
        _id: new Types.ObjectId(userGroupId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      })
      .exec();

    if (!userGroup) {
      throw new UnauthorizedException('User group not found or inactive');
    }

    // Update last login time
    await this.userModel
      .updateOne(
        { _id: new Types.ObjectId(userId) },
        { lastLoginAt: new Date() },
      )
      .exec();

    return {
      id: (user._id as Types.ObjectId).toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId.toString(),
      userGroupId: user.userGroupId.toString(),
      tenant: {
        id: (tenant._id as Types.ObjectId).toString(),
        name: tenant.name,
      },
      userGroup: {
        id: (userGroup._id as Types.ObjectId).toString(),
        name: userGroup.name,
        groupType: userGroup.groupType,
        customPermissions: userGroup.customPermissions,
      },
    };
  }
}
