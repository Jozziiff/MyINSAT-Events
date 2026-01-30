import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ClubsService } from '../../services/clubs.service';
import { ClubSummary } from '../../models/club.model';
import { TokenService } from '../../services/auth/token';
import { fadeSlideIn } from '../../animations';

type SortType = 'followers-desc' | 'followers-asc' | 'events' | 'oldest';

interface ClubWithFollow extends ClubSummary {
  isFollowing?: boolean;
  followLoading?: boolean;
  eventsCount?: number;
}

@Component({
  selector: 'app-clubs',
  imports: [RouterLink, FormsModule],
  templateUrl: './clubs.html',
  styleUrl: './clubs.css',
  animations: [fadeSlideIn]
})
export class ClubsComponent implements OnInit {
  private clubsService = inject(ClubsService);
  private tokenService = inject(TokenService);
  private router = inject(Router);

  clubs = signal<ClubWithFollow[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  searchQuery = signal('');
  selectedSort = signal<SortType>('followers-desc');
  showSortDropdown = signal(false);

  isLoggedIn = computed(() => !!this.tokenService.getAccessToken());

  sortOptions = [
    { value: 'followers-desc' as SortType, label: 'Most Followers', icon: '👥↓' },
    { value: 'followers-asc' as SortType, label: 'Least Followers', icon: '👥↑' },
    { value: 'events' as SortType, label: 'Most Events', icon: '🎉' },
    { value: 'oldest' as SortType, label: 'Oldest Founded', icon: '🕰️' }
  ];

  filteredClubs = computed(() => {
    let filtered = this.clubs();
    const query = this.searchQuery().toLowerCase();

    // Apply search - prioritize name matches
    if (query) {
      filtered = filtered.filter(club => {
        const name = club.name.toLowerCase();
        // Only search in name for more precise results
        return name.includes(query);
      });
    }

    // Apply sort
    const sorted = [...filtered];
    switch (this.selectedSort()) {
      case 'followers-desc':
        sorted.sort((a, b) => (b.followerCount || 0) - (a.followerCount || 0));
        break;
      case 'followers-asc':
        sorted.sort((a, b) => (a.followerCount || 0) - (b.followerCount || 0));
        break;
      case 'events':
        sorted.sort((a, b) => (b.eventsCount || 0) - (a.eventsCount || 0));
        break;
      case 'oldest':
        sorted.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateA - dateB;
        });
        break;
    }

    return sorted;
  });

  async ngOnInit() {
    await this.loadClubs();
  }

  applySort(sort: SortType) {
    this.selectedSort.set(sort);
    this.showSortDropdown.set(false);
  }

  get currentSortLabel(): string {
    return this.sortOptions.find(opt => opt.value === this.selectedSort())?.label || 'Sort';
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

  navigateToClub(clubId: number) {
    this.router.navigate(['/clubs', clubId]);
  }

  formatFoundedDate(date: Date | string): string {
    if (!date) return 'N/A';
    const parsedDate = typeof date === 'string' ? new Date(date) : date;
    const year = parsedDate.getFullYear();
    return isNaN(year) ? 'N/A' : year.toString();
  }
}
