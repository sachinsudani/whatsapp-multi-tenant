import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AuthService } from './auth.service';
import { User } from '../database/schemas/user.schema';
import { Tenant } from '../database/schemas/tenant.schema';
import { UserGroupEntity } from '../database/schemas/user-group.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockTenantModel: any;
  let mockUserGroupModel: any;
  let mockJwtService: any;
  let mockConfigService: any;
  let MockUserModel: any;

  beforeEach(async () => {
    // Create fresh mocks for each test
    mockUserModel = {
      findOne: jest.fn().mockReturnThis(),
      updateOne: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockTenantModel = {
      findOne: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockUserGroupModel = {
      findOne: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    mockJwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn(),
    };

    // Create a mock constructor for User model
    MockUserModel = jest.fn().mockImplementation(() => ({
      save: jest.fn(),
    }));

    // Add static methods to the constructor
    Object.assign(MockUserModel, {
      findOne: mockUserModel.findOne,
      updateOne: mockUserModel.updateOne,
      exec: mockUserModel.exec,
    });

    // Store reference to update the save method later
    MockUserModel.mockInstance = MockUserModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword.length).toBeGreaterThan(20); // bcrypt hash length
    });

    it('should hash different passwords differently', async () => {
      const password1 = 'testPassword123';
      const password2 = 'testPassword456';

      const hash1 = await service.hashPassword(password1);
      const hash2 = await service.hashPassword(password2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('should verify password successfully', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);
    });

    it('should reject invalid password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.verifyPassword(
        'wrongPassword',
        hashedPassword,
      );
      expect(isValid).toBe(false);
    });

    it('should reject empty password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const isValid = await service.verifyPassword('', hashedPassword);
      expect(isValid).toBe(false);
    });
  });

  describe('validateUser', () => {
    it('should validate user successfully', async () => {
      const email = 'test@example.com';
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
        userGroupId: new Types.ObjectId('507f1f77bcf86cd799439013'),
        isActive: true,
        isDeleted: false,
      };

      const mockTenant = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
        isActive: true,
        isDeleted: false,
      };

      const mockUserGroup = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        isActive: true,
        isDeleted: false,
      };

      mockUserModel.exec.mockResolvedValueOnce(mockUser);
      mockTenantModel.exec.mockResolvedValueOnce(mockTenant);
      mockUserGroupModel.exec.mockResolvedValueOnce(mockUserGroup);

      const result = await service.validateUser(email, password);

      expect(result).toBeDefined();
      expect(result?.email).toBe(email);
      expect(result?.firstName).toBe('John');
      expect(result?.lastName).toBe('Doe');
    });

    it('should return null for non-existent user', async () => {
      mockUserModel.exec.mockResolvedValue(null);

      const result = await service.validateUser(
        'nonexistent@example.com',
        'password',
      );

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        password: 'hashedPassword',
        isActive: false,
        isDeleted: false,
      };

      mockUserModel.exec.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null for deleted user', async () => {
      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        password: 'hashedPassword',
        isActive: true,
        isDeleted: true,
      };

      mockUserModel.exec.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null for wrong password', async () => {
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        password: hashedPassword,
        isActive: true,
        isDeleted: false,
      };

      mockUserModel.exec.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@example.com',
        'wrongPassword',
      );

      expect(result).toBeNull();
    });

    it('should throw UnauthorizedException for inactive tenant', async () => {
      const email = 'test@example.com';
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
        userGroupId: new Types.ObjectId('507f1f77bcf86cd799439013'),
        isActive: true,
        isDeleted: false,
      };

      mockUserModel.exec.mockResolvedValueOnce(mockUser);
      mockTenantModel.exec.mockResolvedValueOnce(null); // Inactive tenant

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for inactive user group', async () => {
      const email = 'test@example.com';
      const password = 'testPassword123';
      const hashedPassword = await service.hashPassword(password);

      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
        userGroupId: new Types.ObjectId('507f1f77bcf86cd799439013'),
        isActive: true,
        isDeleted: false,
      };

      const mockTenant = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
        isActive: true,
        isDeleted: false,
      };

      mockUserModel.exec.mockResolvedValueOnce(mockUser);
      mockTenantModel.exec.mockResolvedValueOnce(mockTenant);
      mockUserGroupModel.exec.mockResolvedValueOnce(null); // Inactive user group

      await expect(service.validateUser(email, password)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'testPassword123',
      };

      const hashedPassword = await service.hashPassword(loginDto.password);
      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: loginDto.email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
        userGroupId: new Types.ObjectId('507f1f77bcf86cd799439013'),
        isActive: true,
        isDeleted: false,
      };

      const mockTenant = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
        isActive: true,
        isDeleted: false,
      };

      const mockUserGroup = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
        isActive: true,
        isDeleted: false,
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      mockUserModel.exec.mockResolvedValueOnce(mockUser);
      mockTenantModel.exec.mockResolvedValueOnce(mockTenant);
      mockUserGroupModel.exec.mockResolvedValueOnce(mockUserGroup);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockConfigService.get.mockReturnValue(3600);

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
      expect(result.expiresIn).toBe(3600);
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'wrongPassword',
      };

      mockUserModel.exec.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
        tenantId: '507f1f77bcf86cd799439012',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      const mockTenant = {
        _id: new Types.ObjectId(registerDto.tenantId),
        isActive: true,
        isDeleted: false,
      };

      const mockUserGroup = {
        _id: new Types.ObjectId(registerDto.userGroupId),
        tenantId: new Types.ObjectId(registerDto.tenantId),
        isActive: true,
        isDeleted: false,
      };

      const mockSavedUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: registerDto.email,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phoneNumber: registerDto.phoneNumber,
        tenantId: new Types.ObjectId(registerDto.tenantId),
        userGroupId: new Types.ObjectId(registerDto.userGroupId),
        isActive: true,
        isEmailVerified: false,
        isDeleted: false,
      };

      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      // Mock existing user check - return null (user doesn't exist)
      mockUserModel.exec.mockResolvedValueOnce(null);

      // Mock tenant check
      mockTenantModel.exec.mockResolvedValueOnce(mockTenant);

      // Mock user group check
      mockUserGroupModel.exec.mockResolvedValueOnce(mockUserGroup);

      // Mock token generation
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);

      mockConfigService.get.mockReturnValue(3600);

      // Mock the save method to return the saved user
      const mockSave = jest.fn().mockResolvedValue(mockSavedUser);
      MockUserModel.mockImplementation(() => ({
        save: mockSave,
      }));

      const result = await service.register(registerDto);

      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
      expect(result.user.email).toBe(registerDto.email);
      expect(result.user.firstName).toBe(registerDto.firstName);
      expect(result.user.lastName).toBe(registerDto.lastName);
    });

    it('should throw UnauthorizedException for existing user', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        tenantId: '507f1f77bcf86cd799439012',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      const mockExistingUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: registerDto.email,
      };

      mockUserModel.exec.mockResolvedValue?.(mockExistingUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid tenant', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        tenantId: '507f1f77bcf86cd799439012',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      mockUserModel.exec.mockResolvedValueOnce(null); // No existing user
      mockTenantModel.exec.mockResolvedValueOnce(null); // Invalid tenant

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for invalid user group', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'testPassword123',
        firstName: 'Jane',
        lastName: 'Doe',
        tenantId: '507f1f77bcf86cd799439012',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      const mockTenant = {
        _id: new Types.ObjectId(registerDto.tenantId),
        isActive: true,
        isDeleted: false,
      };

      mockUserModel.exec.mockResolvedValueOnce(null); // No existing user
      mockTenantModel.exec.mockResolvedValueOnce(mockTenant); // Valid tenant
      mockUserGroupModel.exec.mockResolvedValueOnce(null); // Invalid user group

      await expect(service.register(registerDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockPayload = {
        sub: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        tenantId: '507f1f77bcf86cd799439012',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
        userGroupId: new Types.ObjectId('507f1f77bcf86cd799439013'),
        isActive: true,
        isDeleted: false,
      };

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUserModel.exec.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockTokens.accessToken)
        .mockResolvedValueOnce(mockTokens.refreshToken);
      mockConfigService.get.mockReturnValue(3600);

      const result = await service.refreshToken(refreshTokenDto);

      expect(result.accessToken).toBe(mockTokens.accessToken);
      expect(result.refreshToken).toBe(mockTokens.refreshToken);
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const refreshTokenDto: RefreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockPayload = {
        sub: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        tenantId: '507f1f77bcf86cd799439012',
        userGroupId: '507f1f77bcf86cd799439013',
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);
      mockUserModel.exec.mockResolvedValue(null);

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const userId = '507f1f77bcf86cd799439011';

      mockUserModel.exec.mockResolvedValue({ modifiedCount: 1 });

      await service.logout(userId);

      expect(mockUserModel.updateOne).toHaveBeenCalledWith(
        { _id: new Types.ObjectId(userId) },
        expect.objectContaining({
          lastLoginAt: expect.any(Date),
        }),
      );
    });
  });
});
