import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClubsService } from '../../services/clubs.service';
import { Club, ClubSection } from '../../models/club.model';
import { fadeSlideIn } from '../../animations';

@Component({
  selector: 'app-club-detail',
  imports: [RouterLink],
  templateUrl: './club-detail.html',
  styleUrl: './club-detail.css',
  animations: [fadeSlideIn]
})
export class ClubDetailComponent implements OnInit {
  club = signal<Club | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Sections to display (in order, alternating layout)
  sections = signal<{ key: string; section: ClubSection; imageLeft: boolean }[]>([]);

  constructor(
    private route: ActivatedRoute,
    private clubsService: ClubsService
  ) {}

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      await this.loadClub(id);
    }
  }

  private async loadClub(id: number) {
    this.loading.set(true);
    const club = await this.clubsService.getClubById(id);
    
    if (club) {
      this.club.set(club);
      this.buildSections(club);
    } else {
      this.error.set('Club not found');
    }
    
    this.loading.set(false);
  }

  private buildSections(club: Club) {
    const sectionKeys: (keyof Club)[] = ['history', 'mission', 'activities', 'achievements', 'joinUs'];
    const builtSections: { key: string; section: ClubSection; imageLeft: boolean }[] = [];
    
    // Start with image on RIGHT (since About section has image on left)
    let imageLeft = false;

    for (const key of sectionKeys) {
      const section = club[key] as ClubSection | undefined;
      if (section && section.content) {
        builtSections.push({
          key,
          section,
          imageLeft
        });
        imageLeft = !imageLeft; // Alternate
      }
    }

    this.sections.set(builtSections);
  }

  hasContact(club: Club): boolean {
    return !!(club.contact && (
      club.contact.email ||
      club.contact.phone ||
      club.contact.facebook ||
      club.contact.instagram ||
      club.contact.linkedin ||
      club.contact.website
    ));
  }
}
