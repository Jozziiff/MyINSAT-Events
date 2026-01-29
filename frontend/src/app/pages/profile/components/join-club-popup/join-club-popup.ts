import { Component, signal, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ClubsService } from '../../../../services/clubs.service';
import { ClubWithJoinStatus, JoinRequestStatus } from '../../../../models/club.model';

@Component({
  selector: 'app-join-club-popup',
  templateUrl: './join-club-popup.html',
  styleUrl: './join-club-popup.css',
  imports: [RouterModule],
})
export class JoinClubPopup implements OnInit {
  private clubsService = inject(ClubsService);

  @Output() close = new EventEmitter<void>();

  clubs = signal<ClubWithJoinStatus[]>([]);
  loading = signal(true);
  applyingTo = signal<number | null>(null);

  readonly JoinRequestStatus = JoinRequestStatus;

  async ngOnInit() {
    await this.loadClubs();
  }

  async loadClubs() {
    this.loading.set(true);
    const clubs = await this.clubsService.getAllClubsWithJoinStatus();
    this.clubs.set(clubs);
    this.loading.set(false);
  }

  async applyToClub(clubId: number) {
    this.applyingTo.set(clubId);
    const success = await this.clubsService.submitJoinRequest(clubId);
    if (success) {
      // Update local state
      this.clubs.update(clubs => 
        clubs.map(c => c.id === clubId 
          ? { ...c, joinRequestStatus: JoinRequestStatus.PENDING } 
          : c
        )
      );
    }
    this.applyingTo.set(null);
  }

  onBackdropClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('popup-overlay')) {
      this.close.emit();
    }
  }

  closePopup() {
    this.close.emit();
  }

  getButtonText(club: ClubWithJoinStatus): string {
    if (club.isManager) return 'Manager';
    if (club.joinRequestStatus === JoinRequestStatus.PENDING) return 'Pending';
    if (club.joinRequestStatus === JoinRequestStatus.APPROVED) return 'Member';
    if (club.joinRequestStatus === JoinRequestStatus.REJECTED) return 'Apply Again';
    return 'Apply';
  }

  canApply(club: ClubWithJoinStatus): boolean {
    return !club.isManager && 
           club.joinRequestStatus !== JoinRequestStatus.PENDING && 
           club.joinRequestStatus !== JoinRequestStatus.APPROVED;
  }
}
