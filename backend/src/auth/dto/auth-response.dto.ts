import { IsBoolean, IsEmail, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../common/enums';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the user',
  })
  id: number;

  @ApiProperty({
    description: 'Email address of the user',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Full name of the user',
  })
  @IsString()
  fullName: string;

  @ApiProperty({
    description: 'Avatar URL of the user',
    required: false,
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Role of the user in the system',
    enum: UserRole,
  })
  @IsString()
  role: UserRole;

  @ApiProperty({
    description: 'Whether the user has verified their email address',
  })
  @IsBoolean()
  emailVerified: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  @IsString()
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
  })
  @IsString()
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user information',
    type: UserResponseDto,
  })
  user: UserResponseDto;
}

export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  @IsString()
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
  })
  @IsString()
  refreshToken: string;
}
