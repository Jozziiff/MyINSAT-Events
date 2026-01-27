import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ClubsService } from '../../services/clubs.service';
import { Club, ClubSection, ClubWithStats } from '../../models/club.model';
import { TokenService } from '../../services/auth/token';
import { fadeSlideIn, fadeInRight } from '../../animations';

@Component({
  selector: 'app-club-detail',
  imports: [RouterLink],
  templateUrl: './club-detail.html',
  styleUrl: './club-detail.css',
  animations: [fadeSlideIn, fadeInRight]
})
export class ClubDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clubsService = inject(ClubsService);
  private tokenService = inject(TokenService);

  club = signal<ClubWithStats | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  followLoading = signal(false);

  // Computed
  isLoggedIn = computed(() => !!this.tokenService.getAccessToken());
  isFollowing = computed(() => this.club()?.isFollowing ?? false);
  followerCount = computed(() => this.club()?.followerCount ?? 0);

  // Sections to display (in order, alternating layout)
  sections = signal<{ key: string; section: ClubSection; imageLeft: boolean }[]>([]);

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

  async toggleFollow(): Promise<void> {
    const clubData = this.club();
    if (!clubData || !this.isLoggedIn()) return;

    this.followLoading.set(true);
    
    if (this.isFollowing()) {
      const success = await this.clubsService.unfollowClub(clubData.id);
      if (success) {
        this.club.update(c => c ? {
          ...c,
          isFollowing: false,
          followerCount: Math.max(0, c.followerCount - 1),
        } : null);
      }
    } else {
      const success = await this.clubsService.followClub(clubData.id);
      if (success) {
        this.club.update(c => c ? {
          ...c,
          isFollowing: true,
          followerCount: c.followerCount + 1,
        } : null);
      }
    }
    
    this.followLoading.set(false);
  }

  viewClubEvents(): void {
    const clubId = this.club()?.id;
    if (clubId) {
      this.router.navigate([`/clubs/${clubId}/events`]);
    }
  }
}
