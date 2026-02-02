import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthApiService } from '../../../services/auth/auth-api';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPassword {
  private readonly fb = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);

  readonly forgotForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  readonly isLoading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');


  async onSubmit(): Promise<void> {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    try {
      await firstValueFrom(this.authApi.forgotPassword(this.forgotForm.getRawValue()));
      this.successMessage.set(
        'If an account with that email exists, a password reset link has been sent.'
      );
      this.forgotForm.reset();
    } catch (error: any) {
      this.errorMessage.set(
        error.error?.message || 'Failed to send reset email. Please try again.'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.forgotForm.get(fieldName);
    return !!(control?.touched && control?.invalid);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.forgotForm.get(fieldName);
    
    if (!control?.touched || !control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Email is required';
    }

    if (control.errors['email']) {
      return 'Please enter a valid email';
    }

    return '';
  }
}
