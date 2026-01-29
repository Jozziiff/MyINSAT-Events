import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserRating } from '../../../../models/profile.models';

@Component({
    selector: 'app-ratings-section',
    imports: [CommonModule, RouterModule],
    templateUrl: './ratings-section.html',
    styleUrl: './ratings-section.css'
})
export class RatingsSection {
    @Input() ratings: UserRating[] = [];

    showAll = false;

    get maxDisplay(): number {
        return this.showAll ? this.ratings.length : 3;
    }

    toggleShowAll() {
        this.showAll = !this.showAll;
    }
}
