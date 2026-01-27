// Event status enum matching backend
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

// Registration status enum matching backend
export enum RegistrationStatus {
  INTERESTED = 'INTERESTED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
  ATTENDED = 'ATTENDED',
  NO_SHOW = 'NO_SHOW',
}

// Event section structure
export interface EventSection {
  title: string;
  description: string;
  imageUrl?: string;
}

// Club summary for event display
export interface EventClub {
  id: number;
  name: string;
  logoUrl?: string;
}

// Event statistics
export interface EventStats {
  interestedCount: number;
  confirmedCount: number;
  attendedCount: number;
  averageRating: number;
  ratingCount: number;
}

// User's interaction with an event
export interface UserEventInteraction {
  status: RegistrationStatus | null;
  hasRated: boolean;
  userRating?: number;
}

// Event summary for list display (with stats)
export interface EventSummary {
  id: number;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  capacity?: number;
  price?: number;
  photoUrl?: string;
  status: EventStatus;
  club: EventClub | null;
  stats: EventStats;
  userInteraction?: UserEventInteraction;
}

// Full event details
export interface Event {
  id: number;
  clubId: number;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  capacity?: number;
  price?: number;
  photoUrl?: string;
  sections?: EventSection[];
  status: EventStatus;
  createdAt: Date;
  updatedAt: Date;
  club: EventClub | null;
  stats: EventStats;
  userInteraction?: UserEventInteraction;
}

// Rate event request
export interface RateEventRequest {
  rating: number;
  comment?: string;
}

// Event rating response
export interface EventRating {
  id: number;
  userId: number;
  eventId: number;
  rating: number;
  comment?: string;
  createdAt: Date;
  user?: {
    id: number;
    fullName: string;
    avatarUrl?: string;
  };
}
