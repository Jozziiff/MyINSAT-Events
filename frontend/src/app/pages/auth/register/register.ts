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

const MIN_PASSWORD_LENGTH = 8;

/** Validates password against all requirements */
function validatePasswordRequirements(password: string) {
  return {
    hasMinLength: password.length >= MIN_PASSWORD_LENGTH,
    hasUppercase: PASSWORD_PATTERNS.uppercase.test(password),
    hasNumber: PASSWORD_PATTERNS.number.test(password),
    hasSpecialChar: PASSWORD_PATTERNS.specialChar.test(password),
  };
}

/** Custom validator for password requirements */
function passwordValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const req = validatePasswordRequirements(control.value);
  const isValid = req.hasMinLength && req.hasUppercase && req.hasNumber && req.hasSpecialChar;
  return isValid ? null : { passwordRequirements: true };
}

/** Cross-field validator for password matching */
function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  if (!password || !confirmPassword) return null;
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

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

  readonly registerForm = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordValidator]],
    confirmPassword: ['', [Validators.required]],
  }, {
    validators: passwordMatchValidator,
  });

  readonly errorMessage = signal('');
  readonly isLoading = this.authState.isLoading;

  // Password validation signals
  private readonly passwordValue = signal('');
  private readonly confirmPasswordValue = signal('');
  readonly passwordTouched = signal(false);
  readonly confirmPasswordTouched = signal(false);

  // Computed validation states - derived from shared validation logic
  private readonly passwordRequirements = computed(() => validatePasswordRequirements(this.passwordValue()));
  
  readonly hasMinLength = computed(() => this.passwordRequirements().hasMinLength);
  readonly hasUppercase = computed(() => this.passwordRequirements().hasUppercase);
  readonly hasNumber = computed(() => this.passwordRequirements().hasNumber);
  readonly hasSpecialChar = computed(() => this.passwordRequirements().hasSpecialChar);
  
  readonly passwordsMatch = computed(() => {
    const password = this.passwordValue();
    const confirmPassword = this.confirmPasswordValue();
    return password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  });

  constructor() {
    this.setupFormSubscriptions();
  }

  private setupFormSubscriptions(): void {
    this.registerForm.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.passwordValue.set(value));

    this.registerForm.controls.confirmPassword.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.confirmPasswordValue.set(value));
  }

  onPasswordBlur(): void {
    this.passwordTouched.set(true);
  }

  onConfirmPasswordBlur(): void {
    this.confirmPasswordTouched.set(true);
  }

  async onSubmit(): Promise<void> {
    this.passwordTouched.set(true);
    this.confirmPasswordTouched.set(true);

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.errorMessage.set('');
    const { confirmPassword, ...registerData } = this.registerForm.getRawValue();

    try {
      await this.authState.register(registerData);
      this.router.navigate(['/']);
    } catch (error: unknown) {
      const message = this.extractErrorMessage(error);
      this.errorMessage.set(message);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.registerForm.get(fieldName);
    return !!(control?.touched && control?.invalid);
  }

  getErrorMessage(fieldName: string): string {
    const control = this.registerForm.get(fieldName);
    if (!control?.touched || !control?.errors) return '';

    const errors = control.errors;
    if (errors['required']) return `${this.formatFieldName(fieldName)} is required`;
    if (errors['email']) return 'Please enter a valid email';
    if (errors['minlength']) return `${this.formatFieldName(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    return '';
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error?: { message?: string } };
      return apiError.error?.message || 'Registration failed. Please try again.';
    }
    return 'Registration failed. Please try again.';
  }
}
