import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '../entities/user.entity';

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: jest.Mocked<any>;
  let jwtService: jest.Mocked<any>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    (bcrypt.compare as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should throw UnauthorizedException for non-existent user', async () => {
      userRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.login({ username: 'nonexistent', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive role', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        username: 'test',
        isActive: true,
        role: { isActive: false, code: 'STAFF' },
        passwordHash: 'hash',
      });

      await expect(
        service.login({ username: 'test', password: 'test' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      userRepo.findOne.mockResolvedValueOnce({
        username: 'test',
        isActive: true,
        role: { isActive: true, code: 'STAFF' },
        passwordHash: 'hash',
      });

      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      await expect(
        service.login({ username: 'test', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user for valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'staff01',
        fullName: 'Staff 1',
        isActive: true,
        lastLoginAt: null,
        role: { isActive: true, code: 'STAFF' },
        passwordHash: 'hash',
      };

      userRepo.findOne.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true);
      jwtService.signAsync.mockResolvedValueOnce('mock-token');

      const result = await service.login({
        username: 'staff01',
        password: 'staff123',
      });

      expect(result.accessToken).toBe('mock-token');
      expect(result.tokenType).toBe('Bearer');
      expect(result.user.username).toBe('staff01');
      expect(result.user.roleCode).toBe('STAFF');
      expect(userRepo.save).toHaveBeenCalled();
    });
  });
});
