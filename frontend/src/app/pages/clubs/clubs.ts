import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ClubsService } from '../../services/clubs.service';
import { ClubSummary } from '../../models/club.model';
import { fadeSlideIn } from '../../animations';

@Component({
  selector: 'app-clubs',
  imports: [RouterLink],
  templateUrl: './clubs.html',
  styleUrl: './clubs.css',
  animations: [fadeSlideIn]
})
export class ClubsComponent implements OnInit {
  clubs = signal<ClubSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  constructor(private clubsService: ClubsService) {}

  async ngOnInit() {
    await this.loadClubs();
  }

  private async loadClubs() {
    this.loading.set(true);
    const clubs = await this.clubsService.getAllClubs();
    
    if (this.clubsService.error()) {
      this.error.set(this.clubsService.error());
    } else {
      this.clubs.set(clubs);
    }
    
    this.loading.set(false);
  }
}
