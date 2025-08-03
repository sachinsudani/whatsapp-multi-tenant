import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service';
import { User } from '../database/schemas/user.schema';
import { Tenant } from '../database/schemas/tenant.schema';
import { UserGroupEntity } from '../database/schemas/user-group.schema';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

describe('UsersService', () => {
  let service: UsersService;

  // Create a comprehensive mock for the User model
  const createMockUserModel = () => {
    const mockExec = jest.fn();
    const mockSave = jest.fn();

    // Create a flexible findOne mock that can handle both .exec() and .populate().exec()
    const createFindOneMock = () => {
      const mockFindOne = jest.fn().mockReturnValue({
        exec: mockExec,
        populate: jest.fn().mockReturnValue({
          exec: mockExec,
        }),
      });
      return mockFindOne;
    };

    // Create a flexible findByIdAndUpdate mock that can handle both .exec() and .populate().exec()
    const createFindByIdAndUpdateMock = () => {
      const mockFindByIdAndUpdate = jest.fn().mockReturnValue({
        exec: mockExec,
        populate: jest.fn().mockReturnValue({
          exec: mockExec,
        }),
      });
      return mockFindByIdAndUpdate;
    };

    const mockStaticMethods = {
      findOne: createFindOneMock(),
      find: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                exec: mockExec,
              }),
            }),
          }),
        }),
      }),
      findById: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: mockExec,
        }),
      }),
      findByIdAndUpdate: createFindByIdAndUpdateMock(),
      countDocuments: jest.fn().mockReturnValue({
        exec: mockExec,
      }),
    };

    // Mock constructor function
    const MockUserModel = jest.fn().mockImplementation((data) => ({
      ...data,
      save: mockSave,
    }));

    // Add static methods to the constructor
    Object.assign(MockUserModel, mockStaticMethods);

    return {
      MockUserModel,
      mockExec,
      mockSave,
      mockStaticMethods,
    };
  };

  const { MockUserModel, mockExec, mockSave } = createMockUserModel();

  const mockTenantModel = {
    findOne: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockUserGroupModel = {
    findOne: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockAuthService = {
    hashPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: MockUserModel,
        },
        {
          provide: getModelToken(Tenant.name),
          useValue: mockTenantModel,
        },
        {
          provide: getModelToken(UserGroupEntity.name),
          useValue: mockUserGroupModel,
        },
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should create user successfully with admin permissions', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        userGroupId: '507f1f77bcf86cd799439013',
        isActive: true,
        isEmailVerified: false,
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';

      const mockUserGroup = {
        _id: new Types.ObjectId(createUserDto.userGroupId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        isDeleted: false,
      };

      const mockSavedUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        phoneNumber: createUserDto.phoneNumber,
        tenantId: new Types.ObjectId(tenantId),
        userGroupId: new Types.ObjectId(createUserDto.userGroupId),
        isActive: createUserDto.isActive,
        isEmailVerified: createUserDto.isEmailVerified,
        isDeleted: false,
      };

      const mockPopulatedUser = {
        ...mockSavedUser,
        userGroupId: {
          _id: new Types.ObjectId(createUserDto.userGroupId),
          name: 'Editor',
          groupType: 'Editor',
        },
      };

      // Mock existing user check - return null (user doesn't exist)
      mockExec.mockResolvedValueOnce(null);

      // Mock user group check
      mockUserGroupModel.exec.mockResolvedValueOnce(mockUserGroup);

      // Mock password hashing
      mockAuthService.hashPassword.mockResolvedValue('hashedPassword');

      // Mock user save
      mockSave.mockResolvedValue(mockSavedUser);

      // Mock populated user
      mockExec.mockResolvedValueOnce(mockPopulatedUser);

      const result = await service.createUser(
        createUserDto,
        tenantId,
        currentUserGroupType,
      );

      expect(result.email).toBe(createUserDto.email);
      expect(result.firstName).toBe(createUserDto.firstName);
      expect(result.lastName).toBe(createUserDto.lastName);
      expect(result.phoneNumber).toBe(createUserDto.phoneNumber);
      expect(result.tenantId).toBe(tenantId);
      expect(result.userGroupId).toBe(createUserDto.userGroupId);
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(
        createUserDto.password,
      );
    });

    it('should throw ForbiddenException for non-admin users', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Editor';

      await expect(
        service.createUser(createUserDto, tenantId, currentUserGroupType),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for existing user', async () => {
      const createUserDto: CreateUserDto = {
        email: 'existing@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';

      const mockExistingUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: createUserDto.email,
      };

      mockExec.mockResolvedValue(mockExistingUser);

      await expect(
        service.createUser(createUserDto, tenantId, currentUserGroupType),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid user group', async () => {
      const createUserDto: CreateUserDto = {
        email: 'newuser@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';

      mockExec.mockResolvedValueOnce(null); // No existing user
      mockUserGroupModel.exec.mockResolvedValueOnce(null); // Invalid user group

      await expect(
        service.createUser(createUserDto, tenantId, currentUserGroupType),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllUsers', () => {
    it('should return users with pagination', async () => {
      const queryUsersDto: QueryUsersDto = {
        page: 1,
        limit: 10,
        search: 'john',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const tenantId = '507f1f77bcf86cd799439012';

      const mockUsers = [
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          phoneNumber: '+1234567890',
          tenantId: new Types.ObjectId(tenantId),
          userGroupId: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
            name: 'Admin',
            groupType: 'Admin',
          },
          isActive: true,
          isEmailVerified: true,
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockExec.mockResolvedValueOnce(mockUsers);
      mockExec.mockResolvedValueOnce(1); // countDocuments

      const result = await service.findAllUsers(queryUsersDto, tenantId);

      expect(result.users).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.users[0].email).toBe('john@example.com');
    });

    it('should apply filters correctly', async () => {
      const queryUsersDto: QueryUsersDto = {
        page: 1,
        limit: 10,
        userGroupId: '507f1f77bcf86cd799439013',
        isActive: true,
        isEmailVerified: false,
      };

      const tenantId = '507f1f77bcf86cd799439012';

      mockExec.mockResolvedValueOnce([]);
      mockExec.mockResolvedValueOnce(0);

      await service.findAllUsers(queryUsersDto, tenantId);

      expect((MockUserModel as any).find).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
          userGroupId: new Types.ObjectId('507f1f77bcf86cd799439013'),
          isActive: true,
          isEmailVerified: false,
        }),
      );
    });
  });

  describe('findUserById', () => {
    it('should return user by ID', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      const mockUser = {
        _id: new Types.ObjectId(userId),
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        tenantId: new Types.ObjectId(tenantId),
        userGroupId: {
          _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
          name: 'Admin',
          groupType: 'Admin',
        },
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockExec.mockResolvedValue(mockUser);

      const result = await service.findUserById(userId, tenantId);

      expect(result.id).toBe(userId);
      expect(result.email).toBe('john@example.com');
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      mockExec.mockResolvedValue(null);

      await expect(service.findUserById(userId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('should update user successfully with admin permissions', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateUserDto: UpdateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';
      const currentUserId = '507f1f77bcf86cd799439014';

      const mockExistingUser = {
        _id: new Types.ObjectId(userId),
        email: 'john@example.com',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      const mockUpdatedUser = {
        _id: new Types.ObjectId(userId),
        email: updateUserDto.email,
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        phoneNumber: '+1234567890',
        tenantId: new Types.ObjectId(tenantId),
        userGroupId: {
          _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
          name: 'Admin',
          groupType: 'Admin',
        },
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockExec.mockResolvedValueOnce(mockExistingUser); // Existing user check
      mockExec.mockResolvedValueOnce(null); // Email uniqueness check
      mockExec.mockResolvedValueOnce(mockUpdatedUser); // Updated user

      const result = await service.updateUser(
        userId,
        updateUserDto,
        tenantId,
        currentUserGroupType,
        currentUserId,
      );

      expect(result.firstName).toBe(updateUserDto.firstName);
      expect(result.lastName).toBe(updateUserDto.lastName);
      expect(result.email).toBe(updateUserDto.email);
    });

    it('should allow users to update their own profile', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateUserDto: UpdateUserDto = {
        firstName: 'Jane',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Editor';
      const currentUserId = userId; // Same user

      const mockExistingUser = {
        _id: new Types.ObjectId(userId),
        email: 'john@example.com',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      const mockUpdatedUser = {
        _id: new Types.ObjectId(userId),
        email: 'john@example.com',
        firstName: updateUserDto.firstName,
        lastName: 'Doe',
        tenantId: new Types.ObjectId(tenantId),
        userGroupId: {
          _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
          name: 'Editor',
          groupType: 'Editor',
        },
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockExec.mockResolvedValueOnce(mockExistingUser);
      mockExec.mockResolvedValueOnce(mockUpdatedUser);

      const result = await service.updateUser(
        userId,
        updateUserDto,
        tenantId,
        currentUserGroupType,
        currentUserId,
      );

      expect(result.firstName).toBe(updateUserDto.firstName);
    });

    it('should throw ForbiddenException for non-admin updating other user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateUserDto: UpdateUserDto = {
        firstName: 'Jane',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Editor';
      const currentUserId = '507f1f77bcf86cd799439014'; // Different user

      await expect(
        service.updateUser(
          userId,
          updateUserDto,
          tenantId,
          currentUserGroupType,
          currentUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const updateUserDto: UpdateUserDto = {
        firstName: 'Jane',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';
      const currentUserId = '507f1f77bcf86cd799439014';

      mockExec.mockResolvedValue(null);

      await expect(
        service.updateUser(
          userId,
          updateUserDto,
          tenantId,
          currentUserGroupType,
          currentUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully with admin permissions', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';
      const currentUserId = '507f1f77bcf86cd799439014'; // Different user

      const mockUser = {
        _id: new Types.ObjectId(userId),
        email: 'john@example.com',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      mockExec.mockResolvedValue(mockUser);
      mockExec.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.deleteUser(
        userId,
        tenantId,
        currentUserGroupType,
        currentUserId,
      );

      expect(result.message).toBe('User deleted successfully');
    });

    it('should throw ForbiddenException for non-admin users', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Editor';
      const currentUserId = '507f1f77bcf86cd799439014';

      await expect(
        service.deleteUser(
          userId,
          tenantId,
          currentUserGroupType,
          currentUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for self-deletion', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';
      const currentUserId = userId; // Same user

      await expect(
        service.deleteUser(
          userId,
          tenantId,
          currentUserGroupType,
          currentUserId,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';
      const currentUserId = '507f1f77bcf86cd799439014';

      mockExec.mockResolvedValue(null);

      await expect(
        service.deleteUser(
          userId,
          tenantId,
          currentUserGroupType,
          currentUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('changeUserPassword', () => {
    it('should change password successfully with admin permissions', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const newPassword = 'newPassword123';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';
      const currentUserId = '507f1f77bcf86cd799439014'; // Different user

      const mockUser = {
        _id: new Types.ObjectId(userId),
        email: 'john@example.com',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      mockExec.mockResolvedValue(mockUser);
      mockAuthService.hashPassword.mockResolvedValue('hashedNewPassword');
      mockExec.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.changeUserPassword(
        userId,
        newPassword,
        tenantId,
        currentUserGroupType,
        currentUserId,
      );

      expect(result.message).toBe('Password changed successfully');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(newPassword);
    });

    it('should allow users to change their own password', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const newPassword = 'newPassword123';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Editor';
      const currentUserId = userId; // Same user

      const mockUser = {
        _id: new Types.ObjectId(userId),
        email: 'john@example.com',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      mockExec.mockResolvedValue(mockUser);
      mockAuthService.hashPassword.mockResolvedValue('hashedNewPassword');
      mockExec.mockResolvedValue({ modifiedCount: 1 });

      const result = await service.changeUserPassword(
        userId,
        newPassword,
        tenantId,
        currentUserGroupType,
        currentUserId,
      );

      expect(result.message).toBe('Password changed successfully');
      expect(mockAuthService.hashPassword).toHaveBeenCalledWith(newPassword);
    });

    it('should throw ForbiddenException for non-admin changing other user password', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const newPassword = 'newPassword123';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Editor';
      const currentUserId = '507f1f77bcf86cd799439014'; // Different user

      await expect(
        service.changeUserPassword(
          userId,
          newPassword,
          tenantId,
          currentUserGroupType,
          currentUserId,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      const userId = '507f1f77bcf86cd799439011';
      const newPassword = 'newPassword123';
      const tenantId = '507f1f77bcf86cd799439012';
      const currentUserGroupType = 'Admin';
      const currentUserId = '507f1f77bcf86cd799439014';

      mockExec.mockResolvedValue(null);

      await expect(
        service.changeUserPassword(
          userId,
          newPassword,
          tenantId,
          currentUserGroupType,
          currentUserId,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
