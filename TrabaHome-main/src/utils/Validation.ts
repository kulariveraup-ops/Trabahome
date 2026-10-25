import type { WorkerSignupFormData, SignupErrors } from '../types/Worker.types.ts';

// ── NAME VALIDATION ─────────────────────────────────────────────
// Only letters and space, min 2 letters, max 30 characters
export const validateName = (name: string, fieldLabel = 'Name', maxLength = 24): string | null => {
  const val = String(name || '');
  if (!val.trim()) {
    return `${fieldLabel} is required`;
  }
  if (!/^[a-zA-ZñÑ\s]+$/.test(val)) {
    return `${fieldLabel} shall only accept letters and spaces`;
  }
  if (/\s{2,}/.test(val)) {
    return `${fieldLabel} shall only allow one space between words`;
  }
  if (val.trim().length < 2) {
    return `${fieldLabel} must have a minimum of 2 letters`;
  }
  if (val.length > maxLength) {
    return `${fieldLabel} cannot exceed ${maxLength} characters`;
  }
  const letterCount = (val.match(/[a-zA-ZñÑ]/g) || []).length;
  if (letterCount < 2) {
    return `${fieldLabel} must contain at least 2 letters`;
  }
  return null;
};

// ── EMAIL VALIDATION ────────────────────────────────────────────
// Valid email format with generally accepted domains
export const validateEmail = (email: string): string | null => {
  const val = String(email || '').trim();
  if (!val) {
    return 'Email address is required';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@([a-zA-Z0-9-]+\.)+([a-zA-Z]{2,})$/;
  if (!emailRegex.test(val)) {
    return 'Please enter a valid email format (e.g. name@example.com)';
  }
  const parts = val.split('@');
  if (parts.length !== 2) {
    return 'Invalid email address';
  }
  const domain = parts[1].toLowerCase();
  
  // Generally accepted TLDs and domain structures
  const acceptedTlds = [
    'com', 'ph', 'net', 'org', 'edu', 'gov', 'com.ph', 'net.ph', 'org.ph', 'edu.ph', 'gov.ph',
    'io', 'co', 'ai', 'me', 'info', 'biz', 'app', 'dev', 'cloud', 'tech'
  ];
  const tldParts = domain.split('.').slice(1);
  const fullTld = tldParts.join('.');
  const lastTld = tldParts[tldParts.length - 1];

  const hasAcceptedTld = acceptedTlds.includes(fullTld) || acceptedTlds.includes(lastTld);
  if (!hasAcceptedTld) {
    return 'Please enter an email with a generally accepted domain (e.g. @gmail.com, @yahoo.com, .com, .ph)';
  }

  return null;
};

// ── PHILIPPINE MOBILE VALIDATION ────────────────────────────────
// Fixed to 11 numbers, Philippines standard (09XXXXXXXXX), strictly numbers only
export const validatePhilippineMobile = (phone: string): string | null => {
  const val = String(phone || '').trim();
  if (!val) {
    return 'Mobile number is required';
  }
  if (!/^\d+$/.test(val)) {
    return 'Mobile number shall not accept any characters or spaces except for numbers';
  }
  if (val.length !== 11) {
    return 'Mobile number must be fixed to 11 numbers (e.g. 09XXXXXXXXX)';
  }
  if (!val.startsWith('09')) {
    return 'Philippine standard mobile number must start with 09';
  }
  return null;
};

export const normalizePhilippineMobile = (value: string | null | undefined): string | null => {
  if (value === undefined || value === null) return null;
  const raw = String(value).trim();
  if (/^09\d{9}$/.test(raw)) return raw;
  return null;
};

// ── PASSWORD STRENGTH & VALIDATION ──────────────────────────────
// Minimum 8, maximum 24 characters
// Must contain uppercase, lowercase, number, special character (!@#$%^*()\-_+=?), no spaces
// Rejects repetitive characters ("aaa", "111") and easily guessable passwords ("Password123.")
export interface PasswordValidationResult {
  strength: 'Extremely Weak' | 'Weak' | 'Strong' | 'Stronger';
  score: number;
  color: string;
  error: string | null;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
    noSpaces: boolean;
    notRepetitive: boolean;
    notGuessable: boolean;
  };
}

export const checkPasswordStrength = (password: string): PasswordValidationResult => {
  const pwd = String(password || '');
  const checks = {
    length: pwd.length >= 8 && pwd.length <= 24,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    special: /[!@#$%^*()\-_+=?]/.test(pwd),
    noSpaces: pwd.length > 0 && !/\s/.test(pwd),
    notRepetitive: !/(.)\1{2,}/.test(pwd), // no 3 consecutive identical characters
    notGuessable: true,
  };

  const lower = pwd.toLowerCase();
  const commonGuessablePatterns = [
    'password', 'password123', 'qwerty', '12345678', '123456789', 'admin', 'welcome', 'letmein',
    'pass123', 'trabahome', 'iloveyou', 'p@ssword', 'secret', 'abcdef', '111111'
  ];
  for (const pattern of commonGuessablePatterns) {
    if (lower.includes(pattern)) {
      checks.notGuessable = false;
      break;
    }
  }

  let error: string | null = null;
  if (!pwd) {
    error = 'Password is required';
  } else if (!checks.noSpaces) {
    error = 'Password must not contain spaces';
  } else if (pwd.length < 8) {
    error = 'Password must be at least 8 characters';
  } else if (pwd.length > 24) {
    error = 'Password cannot exceed 24 characters';
  } else if (!checks.uppercase) {
    error = 'Password must contain at least one uppercase letter (A-Z)';
  } else if (!checks.lowercase) {
    error = 'Password must contain at least one lowercase letter (a-z)';
  } else if (!checks.number) {
    error = 'Password must contain at least one number (0-9)';
  } else if (!checks.special) {
    error = 'Password must contain a special character (! @ # $ % ^ * ( ) - _ + = ?)';
  } else if (!checks.notRepetitive) {
    error = 'Password must not contain repetitive characters (e.g. "aaa", "111")';
  } else if (!checks.notGuessable) {
    error = 'Password is too common or easily guessable (e.g. "Password123.")';
  }

  // Determine strength rating
  let strength: 'Extremely Weak' | 'Weak' | 'Strong' | 'Stronger' = 'Extremely Weak';
  let score = 0;
  let color = 'bg-red-500';

  if (!pwd) {
    strength = 'Extremely Weak';
    score = 0;
    color = 'bg-gray-300 dark:bg-slate-700';
  } else if (!checks.notRepetitive || !checks.notGuessable || pwd.length < 8 || !checks.noSpaces) {
    strength = 'Extremely Weak';
    score = 1;
    color = 'bg-red-500';
  } else {
    const passedCount = [checks.uppercase, checks.lowercase, checks.number, checks.special].filter(Boolean).length;
    if (passedCount < 4) {
      strength = 'Weak';
      score = 2;
      color = 'bg-amber-500';
    } else if (pwd.length >= 12 && (pwd.match(/[A-Z]/g) || []).length >= 2 && (pwd.match(/[0-9]/g) || []).length >= 2) {
      strength = 'Stronger';
      score = 4;
      color = 'bg-emerald-500';
    } else {
      strength = 'Strong';
      score = 3;
      color = 'bg-blue-600';
    }
  }

  return { strength, score, color, error, checks };
};

// ── FULL STEP 1 VALIDATION ──────────────────────────────────────
export const validateStep1 = (formData: WorkerSignupFormData): SignupErrors => {
  const newErrors: SignupErrors = {};

  const firstNameErr = validateName(formData.firstName, 'First name');
  if (firstNameErr) newErrors.firstName = firstNameErr;

  const lastNameErr = validateName(formData.lastName, 'Last name');
  if (lastNameErr) newErrors.lastName = lastNameErr;

  const emailErr = validateEmail(formData.email);
  if (emailErr) newErrors.email = emailErr;

  const phoneErr = validatePhilippineMobile(formData.phone);
  if (phoneErr) newErrors.phone = phoneErr;

  const pwdStrength = checkPasswordStrength(formData.password);
  if (pwdStrength.error) {
    newErrors.password = pwdStrength.error;
  }

  if (!formData.confirmPassword) {
    newErrors.confirmPassword = 'Confirm password is required';
  } else if (formData.password !== formData.confirmPassword) {
    newErrors.confirmPassword = 'Passwords do not match';
  }

  if (!formData.agreeToTerms || !formData.agreeToPrivacy) {
    newErrors.agreements = 'You must read and agree to the Terms & Conditions and Privacy Policy';
  }

  return newErrors;
};

export const validateStep2 = (formData: WorkerSignupFormData): SignupErrors => {
  const newErrors: SignupErrors = {};
  if (!formData.idFront) {
    newErrors.idUpload = "Please upload a valid Philippine Government ID";
  }
  if (!formData.idType) {
    newErrors.idType = "Please select an ID type.";
  }
  if (!formData.selfie) {
    newErrors.selfieUpload = "Please upload a selfie holding the ID.";
  }
  return newErrors;
};
