const cleanLocationText = (value: unknown): string =>
  String(value || "").trim().replace(/\s+/g, " ");

const normalizeLocationKey = (value: unknown): string =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^city of\s+/i, "")
    .replace(/\s+city$/i, "")
    .replace(/^municipality of\s+/i, "")
    .replace(/[^a-z0-9]+/g, "");

const isValidCoordinate = (lat: number, lng: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180 &&
  !(lat === 0 && lng === 0);

// Comprehensive GPS Coordinates Lookup for all 48 Municipalities and Cities of Pangasinan
export const PANGASINAN_MUNICIPALITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  agno: { lat: 16.1189, lng: 119.7997 },
  aguilar: { lat: 15.8667, lng: 120.2333 },
  alaminos: { lat: 16.1558, lng: 119.9814 },
  alaminoscity: { lat: 16.1558, lng: 119.9814 },
  alcala: { lat: 15.8456, lng: 120.5197 },
  anda: { lat: 16.2917, lng: 119.9500 },
  asingan: { lat: 16.0028, lng: 120.6708 },
  balungao: { lat: 15.9083, lng: 120.6958 },
  bani: { lat: 16.1833, lng: 119.8667 },
  basista: { lat: 15.8500, lng: 120.4000 },
  bautista: { lat: 15.8083, lng: 120.4833 },
  bayambang: { lat: 15.8117, lng: 120.4578 },
  binalonan: { lat: 16.0489, lng: 120.5956 },
  binmaley: { lat: 16.0306, lng: 120.2681 },
  bolinao: { lat: 16.3889, lng: 119.8925 },
  bugallon: { lat: 15.9458, lng: 120.2183 },
  burgos: { lat: 16.0583, lng: 119.8683 },
  calasiao: { lat: 16.0125, lng: 120.3583 },
  dagupan: { lat: 16.0433, lng: 120.3333 },
  dagupancity: { lat: 16.0433, lng: 120.3333 },
  dasol: { lat: 15.9897, lng: 119.8808 },
  infanta: { lat: 15.8278, lng: 119.9083 },
  labrador: { lat: 16.0278, lng: 120.1417 },
  laoac: { lat: 16.0389, lng: 120.5472 },
  lingayen: { lat: 16.0219, lng: 120.2319 },
  mabini: { lat: 16.0708, lng: 119.9403 },
  malasiqui: { lat: 15.9189, lng: 120.4189 },
  manaoag: { lat: 16.0442, lng: 120.4864 },
  mangaldan: { lat: 16.0717, lng: 120.4028 },
  mangatarem: { lat: 15.7892, lng: 120.2925 },
  mapandan: { lat: 16.0278, lng: 120.4542 },
  natividad: { lat: 16.0431, lng: 120.7961 },
  pozorrubio: { lat: 16.1136, lng: 120.5458 },
  pozzorubio: { lat: 16.1136, lng: 120.5458 },
  rosales: { lat: 15.8931, lng: 120.6339 },
  sancarlos: { lat: 15.9281, lng: 120.3489 },
  sancarloscity: { lat: 15.9281, lng: 120.3489 },
  sanfabian: { lat: 16.1208, lng: 120.4042 },
  sanjacinto: { lat: 16.0722, lng: 120.4417 },
  sanmanuel: { lat: 16.0647, lng: 120.6694 },
  sannicolas: { lat: 16.0706, lng: 120.7672 },
  sanquintin: { lat: 15.9861, lng: 120.8167 },
  santabarbara: { lat: 16.0028, lng: 120.4028 },
  santamaria: { lat: 15.9792, lng: 120.7028 },
  santotomas: { lat: 15.8814, lng: 120.5750 },
  sison: { lat: 16.1736, lng: 120.5111 },
  sual: { lat: 16.0833, lng: 120.0972 },
  tayug: { lat: 16.0278, lng: 120.7444 },
  umingan: { lat: 15.9264, lng: 120.8408 },
  urbiztondo: { lat: 15.8239, lng: 120.3297 },
  urdaneta: { lat: 15.9761, lng: 120.5711 },
  urdanetacity: { lat: 15.9761, lng: 120.5711 },
  villasis: { lat: 15.9028, lng: 120.5889 },
};

export const getMunicipalityCoordinates = (
  municipality: string
): { lat: number; lng: number } | null => {
  const key = normalizeLocationKey(municipality);
  if (!key) return null;
  return PANGASINAN_MUNICIPALITY_COORDINATES[key] || null;
};

const hashSeed = (seed: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
};

const applyDeterministicJitter = (
  base: { lat: number; lng: number },
  identifier: string
): { lat: number; lng: number } => {
  if (!identifier) return base;
  const hash = hashSeed(identifier);
  const angle = (hash % 360) * (Math.PI / 180);
  const distanceMeters = 200 + ((hash >> 8) % 600); // 200 to 800 meters scatter
  const deltaLat = (Math.cos(angle) * distanceMeters) / 111320;
  const deltaLng = (Math.sin(angle) * distanceMeters) / (111320 * Math.max(0.2, Math.cos(base.lat * (Math.PI / 180))));
  return {
    lat: Number((base.lat + deltaLat).toFixed(6)),
    lng: Number((base.lng + deltaLng).toFixed(6)),
  };
};

export const getWorkerMapCoordinates = (worker: any): { lat: number; lng: number } | null => {
  // 1. Direct lat/lng on location object
  const location = worker?.location;
  if (location && typeof location === "object") {
    const directLat = Number(location.lat ?? location.latitude);
    const directLng = Number(location.lng ?? location.longitude);
    if (isValidCoordinate(directLat, directLng)) {
      return { lat: directLat, lng: directLng };
    }

    if (Array.isArray(location.coordinates) && location.coordinates.length >= 2) {
      const lng = Number(location.coordinates[0]);
      const lat = Number(location.coordinates[1]);
      if (isValidCoordinate(lat, lng)) return { lat, lng };
    }
  }

  // 2. Direct lat/lng on worker object itself
  const workerLat = Number(worker?.lat ?? worker?.latitude);
  const workerLng = Number(worker?.lng ?? worker?.longitude);
  if (isValidCoordinate(workerLat, workerLng)) {
    return { lat: workerLat, lng: workerLng };
  }

  // 3. Fallback: Municipal Coordinates Dictionary
  const municipalityCandidate =
    worker?.city ||
    worker?.municipality ||
    location?.city ||
    location?.municipality ||
    worker?.locationLabel ||
    worker?.address ||
    (typeof location === "string" ? location : "");

  const municipalityCoords = getMunicipalityCoordinates(municipalityCandidate);
  if (municipalityCoords) {
    const workerId = String(worker?._id || worker?.id || worker?.name || "");
    return applyDeterministicJitter(municipalityCoords, workerId);
  }

  // 4. Default to Pangasinan Province Center (Lingayen) if worker is explicitly in Pangasinan
  const provinceCandidate = String(worker?.province || location?.province || "").toLowerCase();
  if (provinceCandidate.includes("pangasinan")) {
    const defaultCenter = PANGASINAN_MUNICIPALITY_COORDINATES["lingayen"];
    const workerId = String(worker?._id || worker?.id || worker?.name || "");
    return applyDeterministicJitter(defaultCenter, workerId);
  }

  return null;
};

export const getWorkerMunicipality = (worker: any): string =>
  cleanLocationText(worker?.city || worker?.municipality);

export const buildWorkerMunicipalityOptions = (workers: any[] = []): string[] => {
  const municipalityByKey = new Map<string, string>();

  workers.forEach((worker) => {
    const municipality = getWorkerMunicipality(worker);
    const key = municipality.toLocaleLowerCase();
    if (key && !municipalityByKey.has(key)) municipalityByKey.set(key, municipality);
  });

  return [...municipalityByKey.values()].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  );
};

export const workerMatchesMunicipality = (worker: any, selectedMunicipality: unknown): boolean => {
  const selected = cleanLocationText(selectedMunicipality).toLocaleLowerCase();
  if (!selected) return true;
  return getWorkerMunicipality(worker).toLocaleLowerCase() === selected;
};
