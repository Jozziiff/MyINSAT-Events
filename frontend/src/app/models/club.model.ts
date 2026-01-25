// Club section with optional image
export interface ClubSection {
  title: string;
  content: string;
  imageUrl?: string;
}

// Contact information
export interface ClubContact {
  email?: string;
  phone?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
}

// Summary for the clubs list page
export interface ClubSummary {
  id: number;
  name: string;
  shortDescription: string;
  logoUrl: string;
}

// Full club details
export interface Club {
  id: number;
  name: string;
  shortDescription: string;
  logoUrl: string;
  about: string;
  aboutImageUrl?: string;
  history?: ClubSection;
  mission?: ClubSection;
  activities?: ClubSection;
  achievements?: ClubSection;
  joinUs?: ClubSection;
  contact?: ClubContact;
  coverImageUrl?: string;
  ownerId: number;
  createdAt: Date;
  updatedAt: Date;
}

// DTO for creating a new club
export interface CreateClubDto {
  // Required fields
  name: string;
  shortDescription: string;
  logoUrl?: string;

  // Required sections
  about: string;
  aboutImageUrl?: string;

  // Optional sections
  history?: ClubSection;
  mission?: ClubSection;
  activities?: ClubSection;
  achievements?: ClubSection;
  joinUs?: ClubSection;

  // Contact information
  contact?: ClubContact;

  // Cover image
  coverImageUrl?: string;
}
