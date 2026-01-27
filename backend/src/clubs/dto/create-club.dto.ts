import { IsString, IsNotEmpty, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Default images for each section type (using placeholder service for missing files)
export const DEFAULT_SECTION_IMAGES = {
  about: '/uploads/defaults/about-default.jpg',
  history: '/uploads/defaults/history-default.jpg',
  mission: '/uploads/defaults/mission-default.jpg',
  activities: '/uploads/defaults/activities-default.jpg',
  achievements: '/uploads/defaults/achievements-default.jpg',
  joinUs: '/uploads/defaults/join-default.jpg',
  cover: 'https://via.placeholder.com/1920x600/667eea/ffffff?text=Club+Cover',
  logo: 'https://via.placeholder.com/200x200/667eea/ffffff?text=Club+Logo',
};

// Section with image support (defaults to section-specific default image)
export class ClubSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  imageUrl?: string; // Will use default image if not provided
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

// DTO for creating a new club
export class CreateClubDto {
  // Required fields
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  shortDescription: string; // For the clubs list page

  @IsString()
  @IsOptional()
  logoUrl?: string;

  // Required sections
  @IsString()
  @IsNotEmpty()
  about: string; // General description/about the club

  @IsString()
  @IsOptional()
  aboutImageUrl?: string; // Image for the about section

  // Optional sections with optional images
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
  joinUs?: ClubSectionDto; // How to join the club

  // Contact information (optional)
  @ValidateNested()
  @Type(() => ClubContactDto)
  @IsOptional()
  contact?: ClubContactDto;

  // Cover/banner image (optional)
  @IsString()
  @IsOptional()
  coverImageUrl?: string;
}
