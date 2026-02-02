import { Component, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthStateService } from '../../../services/auth/auth-state';

/**
 * Login Component
 * 
 * Handles user authentication with email and password.
 * Uses Angular signals for reactive UI state and follows OnPush change detection.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  // ==================== Form State ====================
  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  // ==================== UI State Signals ====================
  readonly errorMessage = signal<string>('');
  readonly isLoading = this.authState.isLoading;

  // ==================== Event Handlers ====================
  
  /**
   * Handles form submission.
   * Validates credentials and authenticates user.
   */
  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');

    try {
      await this.authState.login(this.loginForm.getRawValue());
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message = this.extractErrorMessage(error);
      this.errorMessage.set(message);
    }
  }

  // ==================== Template Helper Methods ====================
  
  /**
   * Checks if a form field is invalid and has been touched.
   */
  isFieldInvalid(fieldName: string): boolean {
    const control = this.loginForm.get(fieldName);
    return !!(control?.touched && control?.invalid);
  }

  /**
   * Gets the appropriate error message for a form field.
   * @param fieldName - The name of the form field
   * @returns Error message string or empty string if no error
   */
  getErrorMessage(fieldName: string): string {
    const control = this.loginForm.get(fieldName);
    
    if (!control?.touched || !control?.errors) {
      return '';
    }

    const errors = control.errors;

    if (errors['required']) {
      return `${this.formatFieldName(fieldName)} is required`;
    }

    if (errors['email']) {
      return 'Please enter a valid email';
    }

    if (errors['minlength']) {
      const requiredLength = errors['minlength'].requiredLength;
      return `${this.formatFieldName(fieldName)} must be at least ${requiredLength} characters`;
    }

    return '';
  }

  // ==================== Utility Methods ====================
  
  /**
   * Formats a field name with first letter capitalized.
   * @param fieldName - The field name to format
   * @returns Formatted field name
   */
  private formatFieldName(fieldName: string): string {
    return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  }

  /**
   * Extracts error message from API error response.
   * @param error - The caught error
   * @returns User-friendly error message
   */
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error?: { message?: string } };
      return apiError.error?.message || 'Login failed. Please check your credentials.';
    }
    return 'Login failed. Please check your credentials.';
  }
}
