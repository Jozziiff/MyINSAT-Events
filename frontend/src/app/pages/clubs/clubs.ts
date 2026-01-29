import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClubsService } from '../../services/clubs.service';
import { ClubSummary } from '../../models/club.model';
import { TokenService } from '../../services/auth/token';
import { fadeSlideIn } from '../../animations';

interface ClubWithFollow extends ClubSummary {
  isFollowing?: boolean;
  followLoading?: boolean;
}

@Component({
  selector: 'app-clubs',
  imports: [RouterLink],
  templateUrl: './clubs.html',
  styleUrl: './clubs.css',
  animations: [fadeSlideIn]
})
export class ClubsComponent implements OnInit {
  private clubsService = inject(ClubsService);
  private tokenService = inject(TokenService);

  clubs = signal<ClubWithFollow[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  isLoggedIn = computed(() => !!this.tokenService.getAccessToken());

  async ngOnInit() {
    await this.loadClubs();
  }

  private async loadClubs() {
    this.loading.set(true);
    const clubs = await this.clubsService.getAllClubs();
    
    if (this.clubsService.error()) {
      this.error.set(this.clubsService.error());
    } else {
      // Initialize with follow state
      const clubsWithFollow: ClubWithFollow[] = clubs.map(c => ({
        ...c,
        isFollowing: false,
        followLoading: false,
      }));
      
      // Check follow status for logged in users
      if (this.isLoggedIn()) {
        await Promise.all(
          clubsWithFollow.map(async (club) => {
            club.isFollowing = await this.clubsService.isFollowing(club.id);
          })
        );
      }
      
      this.clubs.set(clubsWithFollow);
    }
    
    this.loading.set(false);
  }

  async toggleFollow(club: ClubWithFollow, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!this.isLoggedIn()) return;

    // Update loading state
    this.clubs.update(clubs => 
      clubs.map(c => c.id === club.id ? { ...c, followLoading: true } : c)
    );

    if (club.isFollowing) {
      const success = await this.clubsService.unfollowClub(club.id);
      if (success) {
        this.clubs.update(clubs => 
          clubs.map(c => c.id === club.id ? { ...c, isFollowing: false, followLoading: false } : c)
        );
      } else {
        this.clubs.update(clubs => 
          clubs.map(c => c.id === club.id ? { ...c, followLoading: false } : c)
        );
      }
    } else {
      const success = await this.clubsService.followClub(club.id);
      if (success) {
        this.clubs.update(clubs => 
          clubs.map(c => c.id === club.id ? { ...c, isFollowing: true, followLoading: false } : c)
        );
      } else {
        this.clubs.update(clubs => 
          clubs.map(c => c.id === club.id ? { ...c, followLoading: false } : c)
        );
      }
    }
  }
}
