import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import * as OTPLib from 'otplib';
const authenticator = (OTPLib as any).authenticator;
import { toDataURL } from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

import { User } from '../../users/entities/user.entity';
import { RegisterDto, LoginDto } from '../dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRedis() private redis: Redis,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email }
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await argon2.hash(registerDto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1
    });

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
    });

    await this.userRepository.save(user);

    const verificationToken = uuidv4();
    await this.redis.setex(
      `verify:${user.id}`,
      86400,
      verificationToken
    );

    return {
      message: 'Registration successful. Please verify your email.',
      userId: user.id
    };
  }

  async login(loginDto: LoginDto, ipAddress: string, userAgent: string) {
    const attempts = await this.redis.get(`login_attempts:${loginDto.email}`);
    if (attempts && parseInt(attempts) >= 5) {
      throw new UnauthorizedException('Too many failed attempts. Try again later.');
    }

    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
      select: [
        'id', 'email', 'password', 'mfaEnabled', 'mfaSecret',
        'failedLoginAttempts', 'lockedUntil', 'firstName', 'lastName', 'tokenVersion'
      ]
    });

    if (!user) {
      await this.redis.incr(`login_attempts:${loginDto.email}`);
      await this.redis.expire(`login_attempts:${loginDto.email}`, 900);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is locked. Try again later.');
    }

    const isValidPassword = await argon2.verify(user.password, loginDto.password);

    if (!isValidPassword) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      }
      await this.userRepository.save(user);
      await this.redis.incr(`login_attempts:${loginDto.email}`);
      await this.redis.expire(`login_attempts:${loginDto.email}`, 900);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null as any;
      await this.userRepository.save(user);
    }

    await this.redis.del(`login_attempts:${loginDto.email}`);

    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await this.userRepository.save(user);

    const tokens = await this.generateTokens(user, userAgent);

    if (user.mfaEnabled) {
      return {
        requiresMFA: true,
        tempToken: tokens.tempToken,
      };
    }

    return {
      requiresMFA: false,
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mfaEnabled: user.mfaEnabled,
      },
    };
  }

  async generateTokens(user: User, userAgent: string) {
    const deviceId = this.hashDeviceInfo(userAgent);
    const payload = {
      sub: user.id,
      email: user.email,
      deviceId,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: '15m',
      secret: this.configService.get('JWT_ACCESS_SECRET'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: '7d',
      secret: this.configService.get('JWT_REFRESH_SECRET'),
    });

    const tempToken = this.jwtService.sign(payload, {
      expiresIn: '5m',
      secret: this.configService.get('JWT_TEMP_SECRET'),
    });

    await this.redis.setex(
      `refresh:${user.id}:${deviceId}`,
      604800,
      await argon2.hash(refreshToken)
    );

    return { accessToken, refreshToken, tempToken };
  }

  async enableMFA(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, 'SPay', secret);
    const qrCode = await toDataURL(otpauth);
    await this.redis.setex(`mfa_setup:${userId}`, 300, secret);
    return { secret, qrCode };
  }

  async verifyMFA(userId: string, code: string, isSetup: boolean = false) {
    let secret: string;

    if (isSetup) {
      const storedSecret = await this.redis.get(`mfa_setup:${userId}`);
      if (!storedSecret) {
        throw new BadRequestException('MFA setup expired. Please try again.');
      }
      secret = storedSecret;
    } else {
      const user = await this.userRepository.findOne({ 
        where: { id: userId },
        select: ['mfaSecret']
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      secret = user.mfaSecret;
    }

    const isValid = authenticator.verify({ token: code, secret });
    if (isValid && isSetup) {
      await this.userRepository.update(userId, { mfaEnabled: true, mfaSecret: secret });
      await this.redis.del(`mfa_setup:${userId}`);
    }
    return isValid;
  }

  async refreshToken(refreshToken: string, userAgent: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const deviceId = this.hashDeviceInfo(userAgent);
      if (payload.deviceId !== deviceId) {
        throw new UnauthorizedException('Invalid device');
      }
      const storedHash = await this.redis.get(`refresh:${payload.sub}:${deviceId}`);
      if (!storedHash) {
        throw new UnauthorizedException('Refresh token not found');
      }
      const isValid = await argon2.verify(storedHash, refreshToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const user = await this.userRepository.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return this.generateTokens(user, userAgent);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, userAgent: string) {
    const deviceId = this.hashDeviceInfo(userAgent);
    await this.redis.del(`refresh:${userId}:${deviceId}`);
    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    const keys = await this.redis.keys(`refresh:${userId}:*`);
    if (keys.length) {
      await this.redis.del(...keys);
    }
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1);
    return { message: 'Logged out from all devices' };
  }

  private hashDeviceInfo(userAgent: string): string {
    let hash = 0;
    for (let i = 0; i < userAgent.length; i++) {
      const char = userAgent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}