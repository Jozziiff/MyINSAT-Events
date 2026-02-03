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

  
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, fullName } = registerDto;

    
    const passwordHash = await this.hashPassword(password);

   
    const user = await this.usersService.create({
      email,
      passwordHash,
      fullName,
      role: UserRole.USER,
    });

   
    await this.generateEmailVerificationToken(user.id);

    
    return this.generateAuthResponse(user);
  }

 
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

   
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

 
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

  
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

   
    return this.generateAuthResponse(user);
  }

  async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {

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

   
    const user = await this.usersService.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    
    existingRefreshToken.revokedAt = new Date();
    await this.refreshTokenRepository.save(existingRefreshToken);

  
    const tokens = await this.generateTokens(user);

    return tokens;
  }

  
  async logout(userId: number, refreshToken: string): Promise<void> {
    await this.revokeSingleRefreshToken(userId, refreshToken);
  }

  
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

  
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
    
      return;
    }

   
    const token = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        type: 'password-reset',
      },
      {
        secret: this.configService.get('JWT_PASSWORD_RESET_SECRET'),
        expiresIn: this.configService.get<string>('JWT_PASSWORD_RESET_EXPIRATION') as JwtSignOptions['expiresIn'],
      },
    );

 
    const resetToken = this.passwordResetRepository.create({
      userId: user.id,
      token: token,
    });

    await this.passwordResetRepository.save(resetToken);

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

      
      resetToken.user.passwordHash = await this.hashPassword(newPassword);
      await this.usersService.save(resetToken.user);

      resetToken.usedAt = new Date();
      await this.passwordResetRepository.save(resetToken);

      
      await this.revokeAllRefreshTokens(resetToken.user.id);

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


    
    const accessToken = await this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') as JwtSignOptions['expiresIn'],
    });

    
    const refreshToken = await this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') as JwtSignOptions['expiresIn'],
    });

    
    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      token: refreshToken,
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  private async revokeSingleRefreshToken(userId: number, token: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, token, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private async revokeAllRefreshTokens(userId: number): Promise<void> {
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
        expiresIn: this.configService.get<string>('JWT_EMAIL_VERIFICATION_EXPIRATION') as JwtSignOptions['expiresIn'],
      },
    );

    
    const verificationToken = this.emailVerificationRepository.create({
      userId: userId,
      token: token,
    });

    await this.emailVerificationRepository.save(verificationToken);

  
    await this.mailService.sendEmailVerification(user.email, token);

    return token;
  }
}
