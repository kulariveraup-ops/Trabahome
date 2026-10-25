import {
  PANGASINAN_PROVINCE,
  normalizePangasinanBarangay,
  normalizePangasinanMunicipality,
} from "../constants/SignUpData.ts";

export type ServiceRequestLocationInput = {
  contactNumber: string;
  city: string;
  barangay: string;
  address: string;
};

export type ValidServiceRequestLocation = ServiceRequestLocationInput & {
  province: string;
  location: string;
};

export const validateServiceRequestLocation = (
  input: ServiceRequestLocationInput
): { error: string; value?: never } | { error?: never; value: ValidServiceRequestLocation } => {
  const contactNumber = String(input.contactNumber || "").trim();
  if (!/^09\d{9}$/.test(contactNumber)) {
    return { error: "Contact number must be exactly 11 digits and start with 09." };
  }

  const city = normalizePangasinanMunicipality(input.city);
  if (!city) {
    return { error: "Please select a valid Pangasinan municipality or city." };
  }

  const barangay = normalizePangasinanBarangay(city, input.barangay);
  if (!barangay) {
    return { error: "Please select a barangay that belongs to the chosen municipality or city." };
  }

  const address = String(input.address || "").trim();

  return {
    value: {
      contactNumber,
      province: PANGASINAN_PROVINCE,
      city,
      barangay,
      address,
      location: `${barangay}, ${city}, ${PANGASINAN_PROVINCE}`,
    },
  };
};

export const formatServiceRequestAddress = (location: unknown, address: unknown): string =>
  [String(location || "").trim(), String(address || "").trim()].filter(Boolean).join("\n");

export const parseWorkerServices = (worker: any): string[] => {
  if (!worker) return ["General Repair"];
  const rawList: string[] = [];

  const addItems = (val: any) => {
    if (!val) return;
    if (Array.isArray(val)) {
      val.forEach(addItems);
    } else if (typeof val === "string") {
      val.split(/[,/|]/).forEach((part) => {
        const trimmed = part.trim();
        if (trimmed) rawList.push(trimmed);
      });
    }
  };

  addItems(worker.profession);
  addItems(worker.services);
  addItems(worker.skills);
  addItems(worker.category);
  if (worker.role && worker.role !== "General Repair") {
    addItems(worker.role);
  }
  if (worker.service) {
    addItems(worker.service);
  }
  if (worker.raw) {
    addItems(worker.raw.profession);
    addItems(worker.raw.services);
    addItems(worker.raw.skills);
    if (worker.raw.role && worker.raw.role !== "General Repair") {
      addItems(worker.raw.role);
    }
  }

  const map = new Map<string, string>();
  for (const s of rawList) {
    const key = s.toLowerCase();
    if (!map.has(key)) {
      map.set(key, s);
    }
  }

  const unique = Array.from(map.values());
  if (unique.length === 0) {
    const fallback = String(worker.role || worker.profession || "General Repair").trim();
    return [fallback || "General Repair"];
  }
  return unique;
};
