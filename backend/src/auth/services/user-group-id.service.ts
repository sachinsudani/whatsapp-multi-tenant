import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  UserGroupEntity,
  UserGroupDocument,
} from '../../database/schemas/user-group.schema';
import { UserGroup } from '../../common/enums/user-group.enum';

@Injectable()
export class UserGroupIdService {
  constructor(
    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupDocument>,
  ) {}

  async generateUserGroupId(tenantId?: string): Promise<string> {
    // If tenantId is provided, try to find an existing active user group for that tenant
    if (tenantId) {
      const existingUserGroup = await this.userGroupModel
        .findOne({
          tenantId: new Types.ObjectId(tenantId),
          isActive: true,
          isDeleted: false,
        })
        .exec();

      if (existingUserGroup) {
        return existingUserGroup._id.toString();
      }
    }

    // If no tenantId provided or no user group found, find any active user group
    const existingUserGroup = await this.userGroupModel
      .findOne({ isActive: true, isDeleted: false })
      .exec();

    if (existingUserGroup) {
      return existingUserGroup._id.toString();
    }

    // If no active user group exists, create a default one
    // First, we need a tenant ID - if not provided, we'll use a placeholder
    // In a real scenario, you might want to create a tenant first or handle this differently
    const defaultTenantId = tenantId || new Types.ObjectId().toString();

    const defaultUserGroup = new this.userGroupModel({
      name: 'Default User Group',
      groupType: UserGroup.VIEWER,
      customPermissions: {},
      tenantId: new Types.ObjectId(defaultTenantId),
      isActive: true,
      isDeleted: false,
    });

    const savedUserGroup = await defaultUserGroup.save();
    console.log(savedUserGroup);
    return savedUserGroup._id.toString();
  }

  async getUserGroupById(
    userGroupId: string,
  ): Promise<UserGroupDocument | null> {
    return this.userGroupModel
      .findOne({
        _id: new Types.ObjectId(userGroupId),
        isActive: true,
        isDeleted: false,
      })
      .exec();
  }

  async getUserGroupsByTenantId(
    tenantId: string,
  ): Promise<UserGroupDocument[]> {
    return this.userGroupModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      })
      .exec();
  }

  async validateUserGroupId(userGroupId: string): Promise<boolean> {
    const userGroup = await this.getUserGroupById(userGroupId);
    return userGroup !== null;
  }

  async validateUserGroupForTenant(
    userGroupId: string,
    tenantId: string,
  ): Promise<boolean> {
    const userGroup = await this.userGroupModel
      .findOne({
        _id: new Types.ObjectId(userGroupId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      })
      .exec();

    return userGroup !== null;
  }
}
