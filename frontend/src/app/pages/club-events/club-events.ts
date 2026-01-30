import { Component, computed, effect, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule, Location } from '@angular/common';
import { ClubsService } from '../../services/clubs.service';
import { fadeSlideIn } from '../../animations';

interface ClubEvent {
  id: number;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
  capacity?: number;
  price?: number;
  photoUrl?: string;
  registrationsCount: number;
  attendedCount: number;
  attendanceRate: number;
  ratingsCount: number;
  averageRating: number;
}

interface ClubStatistics {
  totalEvents: number;
  totalAttendance: number;
  averageAttendanceRate: number;
  averageRating: number;
}

interface ClubEventsResponse {
  events: ClubEvent[];
  statistics: ClubStatistics;
}

@Component({
  selector: 'app-club-events',
  imports: [CommonModule, RouterModule],
  templateUrl: './club-events.html',
  styleUrl: './club-events.css',
  animations: [fadeSlideIn],
})
export class ClubEventsComponent implements OnInit {
  clubId = signal<number>(0);
  clubName = signal<string>('');
  eventsData = signal<ClubEventsResponse | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  pastEvents = computed(() => {
    const data = this.eventsData();
    return data?.events || [];
  });

  statistics = computed(() => {
    const data = this.eventsData();
    return data?.statistics || {
      totalEvents: 0,
      totalAttendance: 0,
      averageAttendanceRate: 0,
      averageRating: 0
    };
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private clubsService: ClubsService,
  ) {
    effect(() => {
      const id = this.clubId();
      if (id > 0) {
        this.loadEvents(id);
      }
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const id = parseInt(params['id'], 10);
      if (id) {
        this.clubId.set(id);
        this.loadClubName(id);
      }
    });
  }

  private async loadClubName(clubId: number): Promise<void> {
    const club = await this.clubsService.getClubById(clubId);
    if (club) {
      this.clubName.set(club.name);
    }
  }

  async loadEvents(clubId: number): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    const data = await this.clubsService.getClubEvents(clubId);
    if (data) {
      this.eventsData.set(data);
    } else {
      this.error.set('Failed to load club events');
    }
    this.loading.set(false);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  goBack(): void {
    this.location.back();
  }
}
