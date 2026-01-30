import { IsString, IsNotEmpty, IsOptional, ValidateNested, IsNumber, Min, Max, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Default images for each section type (using placeholder service for missing files)
export const DEFAULT_SECTION_IMAGES = {
  about: '/uploads/defaults/about-default.jpg',
  history: '/uploads/defaults/history-default.jpg',
  mission: '/uploads/defaults/mission-default.jpg',
  activities: '/uploads/defaults/activities-default.jpg',
  achievements: '/uploads/defaults/achievements-default.jpg',
  joinUs: '/uploads/defaults/join-default.jpg',
};

export class ClubSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

// Contact information
export class ClubContactDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  facebook?: string;

  @IsString()
  @IsOptional()
  instagram?: string;

  @IsString()
  @IsOptional()
  linkedin?: string;

  @IsString()
  @IsOptional()
  website?: string;
}

export class CreateClubDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @IsString()
  @IsNotEmpty()
  logoUrl: string;

  @IsString()
  @IsNotEmpty()
  coverImageUrl: string;
  
  @IsString()
  @IsNotEmpty()
  about: string;

  @IsString()
  @IsOptional()
  aboutImageUrl?: string;

  @ValidateNested()
  @Type(() => ClubSectionDto)
  @IsOptional()
  history?: ClubSectionDto;

  @ValidateNested()
  @Type(() => ClubSectionDto)
  @IsOptional()
  mission?: ClubSectionDto;

  @ValidateNested()
  @Type(() => ClubSectionDto)
  @IsOptional()
  activities?: ClubSectionDto;

  @ValidateNested()
  @Type(() => ClubSectionDto)
  @IsOptional()
  achievements?: ClubSectionDto;

  @ValidateNested()
  @Type(() => ClubSectionDto)
  @IsOptional()
  joinUs?: ClubSectionDto;

  @ValidateNested()
  @Type(() => ClubContactDto)
  @IsOptional()
  contact?: ClubContactDto;

  @IsOptional()
  @Transform(({ value }) => value ? parseInt(value, 10) : null)
  @IsInt({ message: 'Founded year must be a valid integer' })
  @Min(1900, { message: 'Founded year must be 1900 or later' })
  @Max(new Date().getFullYear(), { message: `Founded year cannot be in the future` })
  foundedYear?: number;
}
