import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

// Mock all external dependencies
jest.mock('argon2', () => ({
  verify: jest.fn(),
  hash: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn().mockReturnValue('mocked-secret'),
    keyuri: jest.fn().mockReturnValue('mocked-otpauth'),
    verify: jest.fn().mockReturnValue(true),
  },
}));

// Mock Redis
const mockRedis = {
  get: jest.fn(),
  setex: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn(),
  keys: jest.fn(),
};

// Mock JwtService
const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn(),
};

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'JWT_ACCESS_SECRET') return 'access-secret';
    if (key === 'JWT_REFRESH_SECRET') return 'refresh-secret';
    if (key === 'JWT_TEMP_SECRET') return 'temp-secret';
    return null;
  }),
};

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: any;

  const mockUser: Partial<User> = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    firstName: 'John',
    lastName: 'Doe',
    mfaEnabled: false,
    tokenVersion: 1,
    failedLoginAttempts: 0,
    lockedUntil: undefined,
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: 'default_IORedisModuleConnectionToken', useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a new user', async () => {
      const registerDto = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
      };
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(registerDto);
      mockUserRepository.save.mockResolvedValue({ id: '2', ...registerDto });

      const result = await service.register(registerDto);
      expect(result.message).toBe('Registration successful. Please verify your email.');
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: registerDto.email } });
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should throw if user exists', async () => {
      const registerDto = { email: 'existing@example.com', password: 'pass', firstName: 'A', lastName: 'B' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      await expect(service.register(registerDto)).rejects.toThrow('User already exists');
    });
  });

  describe('login', () => {
    it('should return tokens and user if MFA disabled', async () => {
      const loginDto = { email: 'test@example.com', password: 'correct' };
      const ip = '127.0.0.1';
      const userAgent = 'test-agent';

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      // Use the mocked argon2.verify directly
      (argon2.verify as jest.Mock).mockResolvedValue(true);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);
      mockRedis.del.mockResolvedValue(true);
      mockRedis.setex.mockResolvedValue(true);

      const result = await service.login(loginDto, ip, userAgent);
      expect(result.requiresMFA).toBe(false);
      const nonMFAResult = result as { requiresMFA: false; accessToken: string; refreshToken: string; tempToken: string; user: any };
      expect(nonMFAResult.accessToken).toBeDefined();
      expect(nonMFAResult.refreshToken).toBeDefined();
      expect(nonMFAResult.user).toBeDefined();
    });

    it('should throw on invalid password', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrong' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(false);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.incr.mockResolvedValue(1);
      mockRedis.expire.mockResolvedValue(true);

      await expect(service.login(loginDto, 'ip', 'ua')).rejects.toThrow('Invalid credentials');
    });
  });
});