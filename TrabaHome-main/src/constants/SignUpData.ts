import type { WorkerSignupFormData, IDType } from '../types/Worker.types.ts';

// Initial form data
export const initialFormData: WorkerSignupFormData = {
  // Step 1
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false,
  agreeToPrivacy: false,
  
  // Step 2: ID & Biometric Verification
  idType: '',
  idNumber: '',
  idFront: null,
  idFrontPreview: null,
  idBack: null,
  idBackPreview: null,
  selfie: null,
  selfiePreview: null,
  surname: '',
  givenName: '',
  middleName: '',
  dateOfBirth: '',
  nationality: '',
  nationalityOther: '',
  sex: '',
  placeOfBirth: '',
  dateOfIssue: '',
  expiryDate: '',
  issuingAuthority: '',
  
  // Step 3 (Professional Details & Location)
  profession: '',
  province: 'Pangasinan',
  city: '',
  barangay: '',
  proofOfWork: [],
  proofOfWorkPreviews: [],
};

// Step labels for stepper
export const stepLabels: string[] = [
  'Account Info',
  'Professional & Verification',
];

// ID types for selection (Philippine Government Issued IDs)
export const idTypes: IDType[] = [
  { value: '', label: 'Select a Philippine Valid ID' },
  { value: 'philsys', label: 'PhilSys National ID (PhilID / ePhilID)' },
  { value: 'drivers_license', label: "Driver's License (LTO)" },
  { value: 'passport', label: 'Philippine Passport (DFA)' },
  { value: 'umid', label: 'Unified Multi-Purpose ID (UMID / SSS / GSIS)' },
  { value: 'prc', label: 'PRC ID (Professional Regulation Commission)' },
  { value: 'postal', label: 'Philippine Postal ID (PHLPost)' },
  { value: 'voters', label: "Voter's ID / Certificate (COMELEC)" },
  { value: 'sss', label: 'Social Security System (SSS) ID' },
  { value: 'tin', label: 'Tax Identification Number (TIN) Card' },
  { value: 'nbi', label: 'NBI Clearance (with Biometrics)' },
  { value: 'senior_pwd', label: 'Senior Citizen ID / PWD ID' },
];

// Profession options for Step 3 and platform-wide trade selections
export const professionOptions: string[] = [
  'Appliance Repair',
  'Babysitter',
  'Barber',
  'Carpenter',
  'Cook',
  'Electrician',
  'Event Planner',
  'Food Catering',
  'Gardener',
  'Hair Stylist',
  'Handyman',
  'House Cleaning',
  'Laundry',
  'Locksmith',
  'Makeup Artist',
  'Masonry',
  'Massage Therapist',
  'Painter',
  'Pest Control',
  'Pet Grooming',
  'Photographer',
  'Plumber',
  'Roofer',
  'Tailor',
  'Welder',
  'Window Cleaner',
];

export {
  PANGASINAN_PROVINCE,
  pangasinanBarangaysByCity,
  pangasinanCities,
  normalizePangasinanMunicipality,
  getPangasinanBarangays,
  normalizePangasinanBarangay,
} from './pangasinanLocations.js';
