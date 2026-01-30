import { User } from 'src/entities';
import { ClubContactDto, ClubSectionDto } from './create-club.dto';

// Full club details
export class ClubDto {
  id: number;
  name: string;
  shortDescription: string;
  logoUrl: string;
  coverImageUrl?: string;
  about: string;
  aboutImageUrl?: string;
  history?: ClubSectionDto;
  mission?: ClubSectionDto;
  activities?: ClubSectionDto;
  achievements?: ClubSectionDto;
  joinUs?: ClubSectionDto;
  contact?: ClubContactDto;
  foundedYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Summary for the clubs list page
export class ClubSummaryDto {
  id: number;
  name: string;
  shortDescription: string;
  logoUrl: string;
  coverImageUrl?: string;
  about: string;
  foundedYear?: number;
  createdAt: Date;
  followerCount?: number;
  eventsCount?: number;
}
