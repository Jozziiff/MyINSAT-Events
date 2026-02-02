import { IsBoolean, IsEmail, IsString} from 'class-validator';

import { UserRole } from '../../users/enums';

export class UserResponseDto {

  id: number;

  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  avatarUrl: string | null;

  @IsString()
  role: UserRole;

  @IsBoolean()
  emailVerified: boolean;
}

export class AuthResponseDto {
 
  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;

  user: UserResponseDto;
}

export class TokenResponseDto {

  @IsString()
  accessToken: string;

  @IsString()
  refreshToken: string;
}
