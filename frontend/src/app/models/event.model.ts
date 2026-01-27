// Event status enum matching backend
export enum EventStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
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

// Event summary for list display
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
  club: EventClub;
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
  club: EventClub;
}
