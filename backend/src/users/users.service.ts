import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from '../database/schemas/user.schema';
import { Tenant } from '../database/schemas/tenant.schema';
import { UserGroupEntity } from '../database/schemas/user-group.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Tenant.name) private tenantModel: Model<Tenant>,
    @InjectModel(UserGroupEntity.name)
    private userGroupModel: Model<UserGroupEntity>,
    private authService: AuthService,
  ) {}

  async createUser(
    createUserDto: CreateUserDto,
    tenantId: string,
    currentUserGroupType: string,
  ): Promise<UserResponseDto> {
    // Check if current user has permission to create users
    if (currentUserGroupType !== 'Admin') {
      throw new ForbiddenException('Only admins can create users');
    }

    // Check if user already exists in the tenant
    const existingUser = await this.userModel
      .findOne({
        email: createUserDto.email,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (existingUser) {
      throw new BadRequestException(
        'User with this email already exists in this tenant',
      );
    }

    // Validate user group exists and belongs to the tenant
    const userGroup = await this.userGroupModel
      .findOne({
        _id: new Types.ObjectId(createUserDto.userGroupId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      })
      .exec();

    if (!userGroup) {
      throw new BadRequestException(
        'User group not found or does not belong to this tenant',
      );
    }

    // Hash password
    const hashedPassword = await this.authService.hashPassword(
      createUserDto.password,
    );

    // Create new user
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      tenantId: new Types.ObjectId(tenantId),
      userGroupId: new Types.ObjectId(createUserDto.userGroupId),
      isActive: createUserDto.isActive ?? true,
      isEmailVerified: createUserDto.isEmailVerified ?? false,
      isDeleted: false,
    });

    const savedUser = await newUser.save();

    // Populate user group information
    const populatedUser = await this.userModel
      .findById(savedUser._id)
      .populate('userGroupId', 'name groupType')
      .exec();

    return this.mapToUserResponse(populatedUser);
  }

  async findAllUsers(
    queryUsersDto: QueryUsersDto,
    tenantId: string,
  ): Promise<{
    users: UserResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      search,
      userGroupId,
      isActive,
      isEmailVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryUsersDto;

    // Build query
    const query: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    // Add search filter
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    // Add filters
    if (userGroupId) {
      query.userGroupId = new Types.ObjectId(userGroupId);
    }

    if (isActive !== undefined) {
      query.isActive = isActive;
    }

    if (isEmailVerified !== undefined) {
      query.isEmailVerified = isEmailVerified;
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .populate('userGroupId', 'name groupType')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query).exec(),
    ]);

    return {
      users: users.map((user) => this.mapToUserResponse(user)),
      total,
      page,
      limit,
    };
  }

  async findUserById(
    userId: string,
    tenantId: string,
  ): Promise<UserResponseDto> {
    const user = await this.userModel
      .findOne({
        _id: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('userGroupId', 'name groupType')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapToUserResponse(user);
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    tenantId: string,
    currentUserGroupType: string,
    currentUserId: string,
  ): Promise<UserResponseDto> {
    // Check if current user has permission to update users
    if (currentUserGroupType !== 'Admin' && currentUserId !== userId) {
      throw new ForbiddenException(
        'You can only update your own profile or need admin permissions',
      );
    }

    // Check if user exists and belongs to the tenant
    const existingUser = await this.userModel
      .findOne({
        _id: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // If updating email, check for uniqueness
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.userModel
        .findOne({
          email: updateUserDto.email,
          tenantId: new Types.ObjectId(tenantId),
          _id: { $ne: new Types.ObjectId(userId) },
          isDeleted: false,
        })
        .exec();

      if (emailExists) {
        throw new BadRequestException('Email already exists in this tenant');
      }
    }

    // If updating user group, validate it exists and belongs to the tenant
    if (updateUserDto.userGroupId) {
      const userGroup = await this.userGroupModel
        .findOne({
          _id: new Types.ObjectId(updateUserDto.userGroupId),
          tenantId: new Types.ObjectId(tenantId),
          isActive: true,
          isDeleted: false,
        })
        .exec();

      if (!userGroup) {
        throw new BadRequestException(
          'User group not found or does not belong to this tenant',
        );
      }
    }

    // Update user
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        {
          ...updateUserDto,
          ...(updateUserDto.userGroupId && {
            userGroupId: new Types.ObjectId(updateUserDto.userGroupId),
          }),
        },
        { new: true, runValidators: true },
      )
      .populate('userGroupId', 'name groupType')
      .exec();

    return this.mapToUserResponse(updatedUser);
  }

  async deleteUser(
    userId: string,
    tenantId: string,
    currentUserGroupType: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    // Check if current user has permission to delete users
    if (currentUserGroupType !== 'Admin') {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Prevent self-deletion
    if (currentUserId === userId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Check if user exists and belongs to the tenant
    const existingUser = await this.userModel
      .findOne({
        _id: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Soft delete user
    await this.userModel.findByIdAndUpdate(userId, { isDeleted: true }).exec();

    return { message: 'User deleted successfully' };
  }

  async changeUserPassword(
    userId: string,
    newPassword: string,
    tenantId: string,
    currentUserGroupType: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    // Check if current user has permission to change passwords
    if (currentUserGroupType !== 'Admin' && currentUserId !== userId) {
      throw new ForbiddenException(
        'You can only change your own password or need admin permissions',
      );
    }

    // Check if user exists and belongs to the tenant
    const existingUser = await this.userModel
      .findOne({
        _id: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await this.authService.hashPassword(newPassword);

    // Update password
    await this.userModel
      .findByIdAndUpdate(userId, { password: hashedPassword })
      .exec();

    return { message: 'Password changed successfully' };
  }

  private mapToUserResponse(user: any): UserResponseDto {
    return {
      id: (user._id as Types.ObjectId).toString(),
      email: user.email as string,
      firstName: user.firstName as string,
      lastName: user.lastName as string,
      phoneNumber: user.phoneNumber as string | undefined,
      isActive: user.isActive as boolean,
      isEmailVerified: user.isEmailVerified as boolean,
      lastLoginAt: user.lastLoginAt as Date | undefined,
      tenantId: (user.tenantId as Types.ObjectId).toString(),
      userGroupId: (user.userGroupId._id as Types.ObjectId).toString(),
      userGroup: {
        id: (user.userGroupId._id as Types.ObjectId).toString(),
        name: user.userGroupId.name as string,
        groupType: user.userGroupId.groupType as string,
      },
      createdAt: user.createdAt as Date,
      updatedAt: user.updatedAt as Date,
    };
  }
}
