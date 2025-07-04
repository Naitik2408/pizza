import { VALIDATION } from '../constants';

// Email validation
export const validateEmail = (email: string): boolean => {
  return VALIDATION.email.pattern.test(email);
};

// Password validation
export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < VALIDATION.password.minLength) {
    errors.push(`Password must be at least ${VALIDATION.password.minLength} characters long`);
  }
  
  if (password.length > VALIDATION.password.maxLength) {
    errors.push(`Password must be less than ${VALIDATION.password.maxLength} characters long`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Phone number validation
export const validatePhone = (phone: string): boolean => {
  const cleanPhone = phone.replace(/\D/g, '');
  return cleanPhone.length >= VALIDATION.phone.minLength && cleanPhone.length <= VALIDATION.phone.maxLength;
};

// Name validation
export const validateName = (name: string): boolean => {
  const trimmedName = name.trim();
  return trimmedName.length >= VALIDATION.name.minLength && trimmedName.length <= VALIDATION.name.maxLength;
};

// Required field validation
export const validateRequired = (value: any): boolean => {
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return value !== null && value !== undefined;
};

// Form validation helper
export const validateForm = (
  data: Record<string, any>,
  rules: Record<string, Array<(value: any) => string | null>>
): { isValid: boolean; errors: Record<string, string[]> } => {
  const errors: Record<string, string[]> = {};
  
  Object.entries(rules).forEach(([field, validators]) => {
    const fieldErrors: string[] = [];
    const value = data[field];
    
    validators.forEach(validator => {
      const error = validator(value);
      if (error) {
        fieldErrors.push(error);
      }
    });
    
    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

// Common validators
export const validators = {
  required: (message = 'This field is required') => (value: any) => 
    validateRequired(value) ? null : message,
    
  email: (message = 'Please enter a valid email address') => (value: string) =>
    validateEmail(value) ? null : message,
    
  password: (message = 'Password is invalid') => (value: string) => {
    const validation = validatePassword(value);
    return validation.isValid ? null : validation.errors[0] || message;
  },
  
  phone: (message = 'Please enter a valid phone number') => (value: string) =>
    validatePhone(value) ? null : message,
    
  name: (message = 'Please enter a valid name') => (value: string) =>
    validateName(value) ? null : message,
    
  minLength: (min: number, message?: string) => (value: string) =>
    value.length >= min ? null : message || `Must be at least ${min} characters`,
    
  maxLength: (max: number, message?: string) => (value: string) =>
    value.length <= max ? null : message || `Must be less than ${max} characters`,
    
  match: (otherValue: any, message = 'Values do not match') => (value: any) =>
    value === otherValue ? null : message,
};
