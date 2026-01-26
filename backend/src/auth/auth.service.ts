import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import { Role } from '../users/enums/role.enum';
import { RefreshToken } from './entities/refresh-token.entity';
import { EmailVerificationToken } from './entities/email-verification-token.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt-access.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(EmailVerificationToken)
    private emailVerificationRepository: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private passwordResetRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  // ==================== REGISTRATION ====================
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, fullName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = this.userRepository.create({
      email,
      passwordHash,
      fullName,
      role: Role.USER, // Explicitly set role
      emailVerified: false,
      isActive: true,
    });

    await this.userRepository.save(user);

    // Generate email verification token (for future implementation)
    await this.generateEmailVerificationToken(user.id);

    // Generate tokens and return response
    return this.generateAuthResponse(user);
  }

  // ==================== LOGIN ====================
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({ where: { email } });

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
    // First, verify the JWT token itself
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (!payload || payload.sub !== userId) {
        throw new UnauthorizedException('Invalid refresh token');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Hash the provided refresh token to compare with database
    const hashedProvidedToken = this.hashToken(refreshToken);

    // Find the specific refresh token record by its hash
    const existingRefreshToken = await this.refreshTokenRepository.findOne({
      where: {
        tokenHash: hashedProvidedToken,
        userId,
        revokedAt: IsNull(),
      },
    });

    if (!existingRefreshToken) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    // Check if refresh token has expired
    if (new Date() > existingRefreshToken.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

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
  async verifyEmail(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);

    const verificationToken = await this.emailVerificationRepository.findOne({
      where: { tokenHash: hashedToken },
      relations: ['user'],
    });

    if (!verificationToken || verificationToken.usedAt) {
      throw new BadRequestException('Invalid or already used token');
    }

    if (new Date() > verificationToken.expiresAt) {
      throw new BadRequestException('Token expired');
    }

    // Update user
    verificationToken.user.emailVerified = true;
    await this.userRepository.save(verificationToken.user);

    // Mark token as used
    verificationToken.usedAt = new Date();
    await this.emailVerificationRepository.save(verificationToken);
  }

  // ==================== PASSWORD RESET ====================
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(token);

    const PASSWORD_RESET_TOKEN_EXPIRATION_MS = 60 * 60 * 1000;

    const resetToken = this.passwordResetRepository.create({
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_EXPIRATION_MS), // 1 hour
    });

    await this.passwordResetRepository.save(resetToken);

    // TODO: Send email with token
    // For now, we just log it (in production, use email service)
    console.log(`Password reset token for ${email}: ${token}`);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = this.hashToken(token);

    const resetToken = await this.passwordResetRepository.findOne({
      where: { tokenHash: hashedToken },
      relations: ['user'],
    });

    if (!resetToken || resetToken.usedAt) {
      throw new BadRequestException('Invalid or already used token');
    }

    if (new Date() > resetToken.expiresAt) {
      throw new BadRequestException('Token expired');
    }

    // Update password
    resetToken.user.passwordHash = await this.hashPassword(newPassword);
    await this.userRepository.save(resetToken.user);

    // Mark token as used
    resetToken.usedAt = new Date();
    await this.passwordResetRepository.save(resetToken);

    // Revoke all refresh tokens for this user
    await this.revokeRefreshToken(resetToken.user.id);
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
    const hashedRefreshToken = this.hashToken(refreshToken);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hashedRefreshToken,
      expiresAt: new Date(
        Date.now() + this.parseExpirationToMs(this.configService.get<string>('JWT_REFRESH_EXPIRATION') as string),
      ),
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

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateEmailVerificationToken(
    userId: number,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = this.hashToken(token);

    const verificationToken = this.emailVerificationRepository.create({
      userId,
      tokenHash: hashedToken,
      expiresAt: new Date(Date.now() + 86400000), // 24 hours
    });

    await this.emailVerificationRepository.save(verificationToken);

    // TODO: Send email with token
    console.log(`Email verification token for user ${userId}: ${token}`);

    return token;
  }

  private parseExpirationToMs(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // Default 7 days

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }
}
