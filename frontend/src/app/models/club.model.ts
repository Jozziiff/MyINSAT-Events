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
  coverImageUrl?: string;
  about: string;
  followerCount?: number;
  createdAt: Date;
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

// Extended club with stats (from API)
export interface ClubWithStats extends Club {
  followerCount: number;
  isFollowing: boolean;
  upcomingEventsCount: number;
  isManager?: boolean;
  status?: ClubStatus;
}

// Club follower info
export interface ClubFollower {
  id: number;
  fullName: string;
  avatarUrl: string | null;
}

// Join request status
export enum JoinRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Club with join status for browse page
export interface ClubWithJoinStatus extends ClubSummary {
  joinRequestStatus: JoinRequestStatus | null;
  isManager: boolean;
}

// Join request info (for managers)
export interface JoinRequest {
  id: number;
  userId: number;
  clubId: number;
  status: JoinRequestStatus;
  createdAt: Date;
  user: {
    id: number;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
}

// Club status for admin approval
export enum ClubStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// Managed club with status (for profile page)
export interface ManagedClub {
  id: number;
  name: string;
  shortDescription: string;
  logoUrl: string;
  status: ClubStatus;
  createdAt: Date;
}

// DTO for creating a new club
export interface CreateClubDto {
  // Required fields
  name: string;
  shortDescription: string;
  logoUrl: string; // Required - club logo

  // Required sections
  about: string;
  aboutImageUrl?: string; // Optional

  // Optional sections
  history?: ClubSection;
  mission?: ClubSection;
  activities?: ClubSection;
  achievements?: ClubSection;
  joinUs?: ClubSection;

  // Contact information
  contact?: ClubContact;

  // Cover image - required
  coverImageUrl: string;
}
