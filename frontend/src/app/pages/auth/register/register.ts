import { Component, signal, inject, ChangeDetectionStrategy, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthStateService } from '../../../services/auth/auth-state';

/** Password validation regex patterns */
const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  number: /[0-9]/,
  specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
} as const;

/** Minimum password length requirement */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Register Component
 * 
 * Handles user registration with real-time password validation feedback.
 * Uses Angular signals for reactive UI updates and follows OnPush change detection.
 */
@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Register {
  private readonly fb = inject(FormBuilder);
  private readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  // ==================== Form State ====================
  readonly registerForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: this.passwordMatchValidator,
  });

  // ==================== UI State Signals ====================
  readonly errorMessage = signal<string>('');
  readonly isLoading = this.authState.isLoading;

  // ==================== Password Validation Signals ====================
  private readonly passwordValue = signal<string>('');
  private readonly confirmPasswordValue = signal<string>('');
  private readonly passwordTouched = signal<boolean>(false);
  private readonly confirmPasswordTouched = signal<boolean>(false);

  // ==================== Computed Validation States ====================
  /** Checks if password meets minimum length requirement */
  readonly hasMinLength = computed(() => this.passwordValue().length >= MIN_PASSWORD_LENGTH);
  
  /** Checks if password contains at least one uppercase letter */
  readonly hasUppercase = computed(() => PASSWORD_PATTERNS.uppercase.test(this.passwordValue()));
  
  /** Checks if password contains at least one number */
  readonly hasNumber = computed(() => PASSWORD_PATTERNS.number.test(this.passwordValue()));
  
  /** Checks if password contains at least one special character */
  readonly hasSpecialChar = computed(() => PASSWORD_PATTERNS.specialChar.test(this.passwordValue()));
  
  /** Checks if all password requirements are satisfied */
  readonly isPasswordValid = computed(() => 
    this.hasMinLength() && this.hasUppercase() && this.hasNumber() && this.hasSpecialChar()
  );

  /** Tracks if password field has been interacted with */
  readonly isPasswordTouched = computed(() => this.passwordTouched());
  
  /** Tracks if confirm password field has been interacted with */
  readonly isConfirmPasswordTouched = computed(() => this.confirmPasswordTouched());
  
  /** Checks if password and confirm password fields match */
  readonly passwordsMatch = computed(() => {
    const password = this.passwordValue();
    const confirmPassword = this.confirmPasswordValue();
    return password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  });

  constructor() {
    this.setupFormSubscriptions();
  }

  // ==================== Private Methods ====================
  
  /**
   * Sets up reactive subscriptions to form value changes.
   * Uses takeUntilDestroyed for automatic cleanup.
   */
  private setupFormSubscriptions(): void {
    // Sync password value to signal for reactive validation display
    this.registerForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.passwordValue.set(value));

    // Sync confirm password value to signal
    this.registerForm.controls.confirmPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.confirmPasswordValue.set(value));
  }

  /**
   * Cross-field validator to ensure password and confirmPassword match.
   */
  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  // ==================== Event Handlers ====================
  
  /** Handles password field blur event */
  onPasswordBlur(): void {
    this.passwordTouched.set(true);
  }

  /** Handles confirm password field blur event */
  onConfirmPasswordBlur(): void {
    this.confirmPasswordTouched.set(true);
  }

  /**
   * Handles form submission.
   * Validates all fields and submits registration request.
   */
  async onSubmit(): Promise<void> {
    // Mark password fields as touched for validation display
    this.passwordTouched.set(true);
    this.confirmPasswordTouched.set(true);

    // Validate form and custom password requirements
    if (this.registerForm.invalid || !this.isPasswordValid()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');

    // Extract form data, excluding confirmPassword
    const { confirmPassword, ...registerData } = this.registerForm.getRawValue();

    try {
      await this.authState.register(registerData);
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message = this.extractErrorMessage(error);
      this.errorMessage.set(message);
    }
  }

  // ==================== Template Helper Methods ====================
  
  /**
   * Gets the appropriate error message for a form field.
   * @param fieldName - The name of the form field
   * @returns Error message string or empty string if no error
   */
  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    
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
   * Formats a camelCase field name to Title Case with spaces.
   * @param fieldName - The camelCase field name
   * @returns Formatted field name
   */
  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extracts error message from API error response.
   * @param error - The caught error
   * @returns User-friendly error message
   */
  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error?: { message?: string } };
      return apiError.error?.message || 'Registration failed. Please try again.';
    }
    return 'Registration failed. Please try again.';
  }
}
