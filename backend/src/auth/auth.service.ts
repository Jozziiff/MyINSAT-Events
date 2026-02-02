import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt-access.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(EmailVerificationToken)
    private emailVerificationRepository: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  // ==================== REGISTRATION ====================
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, fullName } = registerDto;

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user (UsersService handles duplicate check)
    const user = await this.usersService.create({
      email,
      passwordHash,
      fullName,
      role: UserRole.USER,
    });

    // Generate email verification token (for future implementation)
    await this.generateEmailVerificationToken(user.id);

    // Generate tokens and return response
    return this.generateAuthResponse(user);
  }

  // ==================== LOGIN ====================
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Generate tokens and return response
    return this.generateAuthResponse(user);
  }

  // ==================== REFRESH TOKEN ====================
  async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Note: JWT signature is already verified by JwtRefreshGuard/JwtRefreshStrategy
    // Here we only validate the token exists in DB and is not revoked

    // Find the specific refresh token record
    const existingRefreshToken = await this.refreshTokenRepository.findOne({
      where: {
        token: refreshToken,
        userId,
        revokedAt: IsNull(),
      },
    });

    if (!existingRefreshToken) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Get user
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Revoke the old refresh token (mark as used)
    existingRefreshToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(existingRefreshToken);

    // Generate new token pair
    const tokens = await this.generateTokens(user);

    return tokens;
  }

  // ==================== LOGOUT ====================
  async logout(userId: number): Promise<void> {
    await this.revokeRefreshToken(userId);
  }

  // ==================== EMAIL VERIFICATION ====================
  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify<{
        sub: number;
        type: string;
        exp: number;
      }>(token, {
        secret: this.configService.get('JWT_EMAIL_VERIFICATION_SECRET'),
      });

      if (payload.type !== 'email-verification') {
        throw new BadRequestException('Invalid verification token');
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTimestamp) {
        throw new BadRequestException('Verification link expired');
      }

      // Check if token exists in database and matches
      const verificationToken = await this.emailVerificationRepository.findOne({
        where: {
          userId: payload.sub,
          token: token,
        },
        relations: ['user'],
      });

      if (!verificationToken || verificationToken.usedAt) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      if (verificationToken.user.emailVerified) {
        return {
          message: 'Email is already verified',
        };
      }

      // Verify email and mark token as used (one-time use)
      verificationToken.user.emailVerified = true;
      await this.usersService.save(verificationToken.user);

      verificationToken.usedAt = new Date();
      await this.emailVerificationRepository.save(verificationToken);

      return {
        message: 'Email verified successfully',
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid verification token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Verification link expired');
      }
      throw error;
    }
  }

  // ==================== PASSWORD RESET ====================
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate JWT reset token
    const token = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'password-reset',
      },
      {
        secret: this.configService.get('JWT_PASSWORD_RESET_SECRET'),
        expiresIn: '1h',
      },
    );

    // Store token in database for verification
    const resetToken = this.passwordResetRepository.create({
      userId: user.id,
      token: token,
    });

    await this.passwordResetRepository.save(resetToken);

    // Send password reset email
    await this.mailService.sendPasswordReset(email, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify<{
        sub: number;
        email: string;
        type: string;
        exp: number;
      }>(token, {
        secret: this.configService.get('JWT_PASSWORD_RESET_SECRET'),
      });

      if (payload.type !== 'password-reset') {
        throw new BadRequestException('Invalid reset token');
      }

      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (payload.exp < currentTimestamp) {
        throw new BadRequestException('Reset link expired');
      }

      // Check if token exists in database and matches
      const resetToken = await this.passwordResetRepository.findOne({
        where: {
          userId: payload.sub,
          token: token,
        },
        relations: ['user'],
      });

      if (!resetToken || resetToken.usedAt) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Update password and mark token as used (one-time use)
      resetToken.user.passwordHash = await this.hashPassword(newPassword);
      await this.usersService.save(resetToken.user);

      resetToken.usedAt = new Date();
      await this.passwordResetRepository.save(resetToken);

      // Revoke all refresh tokens for this user
      await this.revokeRefreshToken(resetToken.user.id);

      return {
        message: 'Password reset successfully',
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid reset token');
      }
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Reset link expired');
      }
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================
  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    };
  }

  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as string,
    };


    // Generate access token
    const accessToken = await this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') as JwtSignOptions['expiresIn'],
    });

    // Generate refresh token
    const refreshToken = await this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') as JwtSignOptions['expiresIn'],
    });

    // Store refresh token in database
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  private async revokeRefreshToken(userId: number): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  private async generateEmailVerificationToken(
    userId: number,
  ): Promise<string> {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const token = this.jwtService.sign(
      {
        sub: userId,
        email: user.email,
        type: 'email-verification',
      },
      {
        secret: this.configService.get('JWT_EMAIL_VERIFICATION_SECRET'),
        expiresIn: '24h',
      },
    );

    // Store token in database for verification
    const verificationToken = this.emailVerificationRepository.create({
      userId: userId,
      token: token,
    });

    await this.emailVerificationRepository.save(verificationToken);

    // Send email verification email
    await this.mailService.sendEmailVerification(user.email, token);

    return token;
  }
}
