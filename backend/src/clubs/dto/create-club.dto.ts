// Default images for each section type (served from backend)
export const DEFAULT_SECTION_IMAGES = {
  about: '/uploads/defaults/about-default.jpg',
  history: '/uploads/defaults/history-default.jpg',
  mission: '/uploads/defaults/mission-default.jpg',
  activities: '/uploads/defaults/activities-default.jpg',
  achievements: '/uploads/defaults/achievements-default.jpg',
  joinUs: '/uploads/defaults/join-default.jpg',
  cover: '/uploads/defaults/cover-default.jpg',
  logo: '/uploads/defaults/logo-default.png',
};

// Section with image support (defaults to section-specific default image)
export class ClubSectionDto {
  title: string;
  content: string;
  imageUrl?: string; // Will use default image if not provided
}

// Contact information
export class ClubContactDto {
  email?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

// DTO for creating a new club
export class CreateClubDto {
  // Required fields
  name: string;
  shortDescription: string; // For the clubs list page
  logoUrl: string;

  // Required sections
  about: string; // General description/about the club
  aboutImageUrl?: string; // Image for the about section

  // Optional sections with optional images
  history?: ClubSectionDto;
  mission?: ClubSectionDto;
  activities?: ClubSectionDto;
  achievements?: ClubSectionDto;
  joinUs?: ClubSectionDto; // How to join the club

  // Contact information (optional)
  contact?: ClubContactDto;

  // Cover/banner image (optional)
  coverImageUrl?: string;
}
