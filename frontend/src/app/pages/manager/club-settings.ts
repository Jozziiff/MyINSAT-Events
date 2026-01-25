import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { fadeSlideIn } from '../../animations';
import { ManagerApiService } from '../../services/manager-api.service';

@Component({
    selector: 'app-club-settings',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './club-settings.html',
    styleUrl: './club-settings.css',
    animations: [fadeSlideIn]
})
export class ClubSettingsComponent implements OnInit {
    clubForm: FormGroup;
    loading = signal(true);
    saving = signal(false);
    error = signal('');
    successMessage = signal('');

    constructor(
        private fb: FormBuilder,
        private managerApi: ManagerApiService,
        private router: Router
    ) {
        this.clubForm = this.fb.group({
            name: ['', [Validators.required, Validators.minLength(3)]],
            description: [''],
            paymentInfo: ['']
        });
    }

    ngOnInit() {
        this.loadClubData();
    }

    loadClubData() {
        this.loading.set(true);
        this.error.set('');

        this.managerApi.getClub().subscribe({
            next: (club) => {
                this.clubForm.patchValue({
                    name: club.name,
                    description: club.description || '',
                    paymentInfo: club.paymentInfo || ''
                });
                this.loading.set(false);
            },
            error: (err) => {
                this.error.set('Failed to load club settings');
                this.loading.set(false);
                console.error(err);
            }
        });
    }

    onSubmit() {
        if (this.clubForm.invalid) {
            this.clubForm.markAllAsTouched();
            return;
        }

        this.saving.set(true);
        this.error.set('');
        this.successMessage.set('');

        this.managerApi.updateClub(this.clubForm.value).subscribe({
            next: () => {
                this.successMessage.set('Club settings updated successfully!');
                this.saving.set(false);
                setTimeout(() => this.successMessage.set(''), 3000);
            },
            error: (err) => {
                this.error.set(err.error?.message || 'Failed to update club settings');
                this.saving.set(false);
            }
        });
    }

    goBack() {
        this.router.navigate(['/manager']);
    }
}
