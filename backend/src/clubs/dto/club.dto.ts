import { ClubContactDto, ClubSectionDto } from './create-club.dto';

// Full club details (returned when clicking on a club)
export class ClubDto {
  id: number;
  name: string;
  shortDescription: string;
  logoUrl: string;
  about: string;
  aboutImageUrl?: string;
  history?: ClubSectionDto;
  mission?: ClubSectionDto;
  activities?: ClubSectionDto;
  achievements?: ClubSectionDto;
  joinUs?: ClubSectionDto;
  contact?: ClubContactDto;
  coverImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Summary for the clubs list page
export class ClubSummaryDto {
  id: number;
  name: string;
  shortDescription: string;
  logoUrl: string;
}
