import type { WorkerProfile } from '../types/Worker.types.ts';

export const initialProfile: WorkerProfile = {
  firstName: "",
  lastName: "",
  fullName: "",
  profession: "",
  barangay: "",
  city: "",
  province: "",
  locationLabel: "",
  location: "",
  avatar: "",
  bio: "",
  yearsExperience: 0,
  languages: [],
  availabilityStatus: "",
  workingSchedule: "",
  phone: "",
  email: "",
  facebook: "",
  images: [null, null, null],
  rating: 0,
  ratingsCount: 0,
  status: "",
  isVerified: false
};
