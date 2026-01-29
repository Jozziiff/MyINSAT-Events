import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserService } from '../../services/user.service';
import { fadeSlideIn } from '../../animations';

export interface PublicUserProfile {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  studentYear: string | null;
  createdAt: Date;
  followedClubs: { id: number; name: string; logoUrl: string | null; shortDescription: string }[];
  managedClubs: { id: number; name: string; logoUrl: string | null; shortDescription: string }[];
  upcomingEvents: { id: number; title: string; photoUrl: string | null; startTime: Date; clubName: string; status: string }[];
  pastEvents: { id: number; title: string; photoUrl: string | null; startTime: Date; clubName: string; status: string }[];
}

@Component({
  selector: 'app-user-profile',
  imports: [CommonModule, RouterModule],
  templateUrl: './user-profile.html',
  styleUrls: ['./user-profile.css'],
  animations: [fadeSlideIn]
})
export class UserProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);

  loading = signal(true);
  error = signal<string | null>(null);
  profile = signal<PublicUserProfile | null>(null);

  async ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      await this.loadProfile(id);
    } else {
      this.error.set('User not found');
      this.loading.set(false);
    }
  }

  async loadProfile(userId: number) {
    this.loading.set(true);
    this.error.set(null);

    try {
      const profile = await this.userService.getPublicProfile(userId);
      if (profile) {
        this.profile.set(profile);
      } else {
        this.error.set('User not found');
      }
    } catch (err: any) {
      this.error.set(err?.message || 'Failed to load user profile');
    } finally {
      this.loading.set(false);
    }
  }

  goBack() {
    window.history.back();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'INTERESTED': 'Interested',
      'CONFIRMED': 'Going',
      'PENDING_PAYMENT': 'Pending Payment',
      'ATTENDED': 'Attended',
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'INTERESTED': 'status-interested',
      'CONFIRMED': 'status-confirmed',
      'PENDING_PAYMENT': 'status-pending',
      'ATTENDED': 'status-attended',
    };
    return classes[status] || '';
  }
}
