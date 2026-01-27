import { Component, signal, inject, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { firstValueFrom, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../services/auth/auth-api';

@Component({
  selector: 'app-verify-email',
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VerifyEmail implements OnInit {
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal<boolean>(true);
  readonly successMessage = signal<string>('');
  readonly errorMessage = signal<string>('');

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParams['token'];

    if (!token) {
      this.isLoading.set(false);
      this.errorMessage.set('Invalid or missing verification token');
      return;
    }

    try {
      const response = await firstValueFrom(this.authApi.verifyEmail({ token }));
      this.successMessage.set(response.message || 'Email verified successfully!');
      
      // Redirect to login after 3 seconds (cleaned up automatically if component destroyed)
      timer(3000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.router.navigate(['/login']);
        });
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Failed to verify email. The link may be expired.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
