export interface UserProfile {
  id: number;
  fullName: string;
  bio: string;
  studentYear: string;
  avatarUrl: string;
}

export interface ProfileEvent {
  id: number;
  title: string;
  date: string;
  status: 'upcoming' | 'past';
}

export interface FollowedClub {
  id: number;
  name: string;
  logoUrl: string;
}

// Backend data models for user profiles, events, and followed clubs will change as needed.
