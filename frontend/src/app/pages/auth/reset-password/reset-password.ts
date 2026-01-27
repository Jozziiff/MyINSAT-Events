import { Component, signal, inject, ChangeDetectionStrategy, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { firstValueFrom, timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthApiService } from '../../../services/auth/auth-api';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetPassword implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly resetForm: FormGroup;
  readonly isLoading = signal<boolean>(false);
  readonly successMessage = signal<string>('');
  readonly errorMessage = signal<string>('');
  private token = '';

  constructor() {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParams['token'] || '';
    
    if (!this.token) {
      this.errorMessage.set('Invalid or missing reset token');
    }
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('newPassword');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid || !this.token) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(this.authApi.resetPassword({
        token: this.token,
        newPassword: this.resetForm.value.newPassword
      }));
      
      this.successMessage.set('Password reset successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds (cleaned up automatically if component destroyed)
      timer(2000)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          this.router.navigate(['/login']);
        });
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Failed to reset password. The link may be expired.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.resetForm.get(fieldName);
    
    if (!control?.touched || !control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return fieldName === 'newPassword' ? 'Password is required' : 'Please confirm your password';
    }

    if (control.errors['minlength']) {
      return `Password must be at least ${control.errors['minlength'].requiredLength} characters`;
    }

    return '';
  }

  getFormError(): string {
    if (this.resetForm.errors?.['passwordMismatch'] && 
        this.resetForm.get('confirmPassword')?.touched) {
      return 'Passwords do not match';
    }
    return '';
  }
}
