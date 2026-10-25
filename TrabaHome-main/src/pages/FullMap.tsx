// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Navbar from "../components/requestpages/Navbar";
import ServiceRequestSuccessModal from "../components/requestpages/ServiceRequestSuccessModal.tsx";
import ServiceRequestProofreadModal from "../components/requestpages/ServiceRequestProofreadModal.tsx";
import ServiceRequestContactLocationFields from "../components/requestpages/ServiceRequestContactLocationFields.tsx";
import WorkerSearchBar from "../components/search/WorkerSearchBar.tsx";
import {
  homeownerAPI,
  SUSPENDED_HOMEOWNER_REQUEST_MESSAGE,
  isSuspendedHomeownerAccount,
} from "../services/HomeownerApi.ts";
import { clearHomeownerSession } from "../utils/homeownerAuth.ts";
import { savePendingServiceRequest } from "../services/pendingServiceRequest.ts";
import { normalizePangasinanMunicipality } from "../constants/SignUpData.ts";
import { formatServiceRequestAddress, parseWorkerServices, validateServiceRequestLocation } from "../utils/serviceRequestForm.ts";
import { getWorkerAvailabilityStyle, getWorkerLiveStatus } from "../utils/workerAvailability.ts";
import { useMinuteTicker } from "../hooks/useMinuteTicker.ts";
import {
  buildWorkerMunicipalityOptions,
  getWorkerMapCoordinates,
  workerMatchesMunicipality,
} from "../utils/workerDiscoveryLocation.ts";
import {
  MapIcon,
  ListIcon,
  HammerIcon,
  TrowelIcon,
  DropletIcon,
  ZapIcon,
  BrushIcon,
  SproutIcon,
  WrenchIcon,
  MapPinIcon,
  ChevronDownIcon,
  PlusIcon,
  MinusIcon,
  ArrowRightIcon,
  LockIcon,
  SearchIcon,
  XIcon,
} from "../Icons";

const DEFAULT_CENTER = { lat: 16.0433, lng: 120.3333 };
const DEFAULT_ZOOM = 11;

const WORKER_API_PREFIXES = [
  `${(import.meta.env || {}).VITE_API_BASE_URL || "http://localhost:8000/api"}/workers`,
  `${(import.meta.env || {}).VITE_API_BASE_URL || "http://localhost:8000/api"}/worker`,
];

const normalizeText = (value) => String(value || "").trim();

const normalizeLocationLabel = (item) => {
  if (!item) return "Location";
  if (typeof item.locationLabel === "string" && item.locationLabel.trim()) {
    return item.locationLabel.trim();
  }
  if (typeof item.location === "string" && item.location.trim()) {
    return item.location.trim();
  }
  if (item.location && typeof item.location === "object") {
    const label =
      item.location.label ||
      item.location.address ||
      item.location.location ||
      item.location.name ||
      [item.location.barangay, item.location.city].filter(Boolean).join(", ");
    if (label) return String(label).trim();
  }
  const fallback = [item.barangay, item.city, item.municipality, item.province].filter(Boolean).join(", ");
  return fallback || "Location";
};

const fetchWithFallback = async (path = "", options = {}) => {
  let lastError = null;
  const normalizedPath = path ? `/${path.replace(/^\/+/, "")}` : "";

  for (let index = 0; index < WORKER_API_PREFIXES.length; index += 1) {
    const prefix = WORKER_API_PREFIXES[index];
    try {
      const response = await fetch(`${prefix}${normalizedPath}`, options);
      if (response.status === 404) {
        lastError = new Error("Not found");
        continue;
      }
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Request failed");
      }
      if (response.status === 204) return null;
      return response.json();
    } catch (error) {
      lastError = error;
      throw error;
    }
  }

  throw lastError;
};

let fullMapWorkersRequest = null;
let fullMapWorkersRequestAt = 0;
const fetchFullMapWorkers = () => {
  if (fullMapWorkersRequest && Date.now() - fullMapWorkersRequestAt < 15_000) {
    return fullMapWorkersRequest;
  }
  fullMapWorkersRequestAt = Date.now();
  fullMapWorkersRequest = fetchWithFallback("").catch((error) => {
    fullMapWorkersRequest = null;
    throw error;
  });
  return fullMapWorkersRequest;
};

const getRoleIcon = (role) => {
  switch (String(role || "").toLowerCase()) {
    case "mason":
      return <TrowelIcon className="w-4 h-4" />;
    case "plumber":
      return <DropletIcon className="w-4 h-4" />;
    case "electrician":
      return <ZapIcon className="w-4 h-4" />;
    case "cleaner":
      return <BrushIcon className="w-4 h-4" />;
    case "gardener":
      return <SproutIcon className="w-4 h-4" />;
    case "general repair":
      return <WrenchIcon className="w-4 h-4" />;
    default:
      return <HammerIcon className="w-4 h-4" />;
  }
};

const getMarkerIcon = (worker) => {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translateY(-2px);
      ">
        <div style="
          width: 52px;
          height: 52px;
          border-radius: 999px;
          overflow: hidden;
          border: 4px solid #ffffff;
          box-shadow: 0 14px 28px rgba(11, 59, 104, 0.32);
          background: #0B3B68;
          position: relative;
        ">
          <img
            src="${worker.image}"
            alt="${worker.name}"
            style="width:100%;height:100%;object-fit:cover;display:block;"
          />
        </div>
        <div style="
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 12px solid #0B3B68;
          margin-top: -1px;
          filter: drop-shadow(0 8px 14px rgba(11, 59, 104, 0.18));
        "></div>
      </div>
    `,
    iconSize: [52, 64],
    iconAnchor: [26, 60],
    popupAnchor: [0, -54],
  });
};

const normalizeWorker = (item) => {
  if (!item) return null;
  const id = item._id || item.id;
  if (!id) return null;

  const firstName = normalizeText(item.firstName);
  const lastName = normalizeText(item.lastName);
  const name =
    [firstName, lastName].filter(Boolean).join(" ") ||
    item.name ||
    item.fullName ||
    item.email ||
    "Worker";

  const role = item.profession || item.service || item.role || item.category || "General Repair";
  const barangay = normalizeText(item.barangay);
  const city = normalizeText(item.city);
  const locationLabel = normalizeLocationLabel(item);
  const ratingValue = item.rating ?? item.averageRating ?? item.score ?? 0;
  const rating = Number.isFinite(Number(ratingValue)) ? Number(ratingValue) : 0;
  const availabilityStatus = String(item.availabilityStatus || item.availability?.status || "").trim();
  const workingSchedule = String(item.workingSchedule || item.availability?.schedule || "").trim();
  const image =
    item.profilePhotoUrl ||
    item.avatar ||
    item.profileImage ||
    item.image ||
    item.photo ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

  const coords = getWorkerMapCoordinates(item);

  const liveStatus = getWorkerLiveStatus(workingSchedule, availabilityStatus);

  return {
    id: String(id),
    name,
    role,
    rating,
    image,
    barangay,
    city,
    locationLabel,
    availabilityStatus,
    workingSchedule,
    liveStatus,
    coords,
  };
};

const MapFitController = ({ points }) => {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (!points.length) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM, { animate: true });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], animate: true });
    }
  }, [map, points]);

  return null;
};

export default function FullMap() {
  useMinuteTicker();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);

  const urlService = normalizeText(searchParams.get("service"));
  const urlLocation = normalizeText(searchParams.get("location"));
  const currentParams = location.search;

  const [selectedService, setSelectedService] = useState(urlService);
  const [selectedLocation, setSelectedLocation] = useState(urlLocation);
  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isProofreadOpen, setIsProofreadOpen] = useState(false);
  const [preparedRequestLocation, setPreparedRequestLocation] = useState<any>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);
  const selectedWorkerRef = useRef<any | null>(null);
  const [selectedWorkerName, setSelectedWorkerName] = useState("");
  const [selectedWorkerRole, setSelectedWorkerRole] = useState("");
  const [selectedWorkerServices, setSelectedWorkerServices] = useState<string[]>([]);
  const [activeWorkerBookings, setActiveWorkerBookings] = useState<Array<{ preferredDate: string; preferredTime: string }>>([]);
  const [requestDescription, setRequestDescription] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [serviceCity, setServiceCity] = useState("");
  const [serviceBarangay, setServiceBarangay] = useState("");
  const [serviceLocation, setServiceLocation] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("00:00");
  const [submittedServiceLocation, setSubmittedServiceLocation] = useState("");
  const [submittedContactNumber, setSubmittedContactNumber] = useState("");
  const [isBookingSending, setIsBookingSending] = useState(false);
  const bookingSendingRef = useRef(false);
  const [showRequestValidation, setShowRequestValidation] = useState(false);
  const [priceAgreementChecked, setPriceAgreementChecked] = useState(false);

  useEffect(() => {
    setSelectedService(urlService);
    setSelectedLocation(urlLocation);
  }, [urlService, urlLocation]);

  useEffect(() => {
    let isMounted = true;

    const loadWorkers = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const data = await fetchFullMapWorkers();
        const items = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
            ? data.items
            : Array.isArray(data)
              ? data
              : [];
        const normalized = items.map(normalizeWorker).filter(Boolean);
        if (isMounted) setWorkers(normalized);
      } catch {
        if (isMounted) setErrorMessage("Unable to load workers.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadWorkers();

    const handleSync = () => {
      fullMapWorkersRequest = null;
      fullMapWorkersRequestAt = 0;
      loadWorkers();
    };

    window.addEventListener("trabahome:worker-changed", handleSync);
    window.addEventListener("trabahome:user-registered", handleSync);
    window.addEventListener("trabahome:dashboard-refresh", handleSync);

    const handleStorage = (e) => {
      if (e.key === "trabahome_sync_worker" || (e.key && e.key.startsWith("trabahome_worker_list"))) {
        handleSync();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener("trabahome:worker-changed", handleSync);
      window.removeEventListener("trabahome:user-registered", handleSync);
      window.removeEventListener("trabahome:dashboard-refresh", handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const serviceOptions = useMemo(
    () => [...new Set(workers.map((worker) => worker.role).filter(Boolean))].sort(),
    [workers]
  );
  const locationOptions = useMemo(
    () => buildWorkerMunicipalityOptions(workers),
    [workers]
  );
  const locationSelectValue = useMemo(() => {
    const selected = selectedLocation.trim().toLocaleLowerCase();
    return locationOptions.find(
      (option) => option.toLocaleLowerCase() === selected
    ) || "";
  }, [locationOptions, selectedLocation]);

  const filteredWorkers = useMemo(() => {
    const serviceFilter = normalizeText(selectedService).toLowerCase();
    const locationFilter = normalizeText(locationSelectValue).toLowerCase();

    return workers.filter((worker) => {
      const workerRole = normalizeText(worker.role).toLowerCase();
      const matchesService =
        !serviceFilter ||
        workerRole.includes(serviceFilter) ||
        serviceFilter.includes(workerRole);
      const matchesLocation = workerMatchesMunicipality(worker, locationFilter);
      return matchesService && matchesLocation;
    });
  }, [workers, selectedService, locationSelectValue]);

  const mapWorkers = useMemo(
    () => filteredWorkers.filter((worker) => worker.coords),
    [filteredWorkers]
  );

  const mapPoints = useMemo(() => mapWorkers.map((worker) => worker.coords), [mapWorkers]);
  const scrollToTop = () => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  const handleUpdateSearch = () => {
    const params = new URLSearchParams();
    const trimmedService = normalizeText(selectedService);
    const trimmedLocation = normalizeText(locationSelectValue);

    if (trimmedService) params.set("service", trimmedService);
    if (trimmedLocation) params.set("location", trimmedLocation);
    navigate(params.toString() ? `/map?${params.toString()}` : "/map", { replace: true });
  };

  const openRequestModal = async (worker) => {
    try {
      const currentHomeowner = await homeownerAPI.me({ fresh: true });
      if (isSuspendedHomeownerAccount(currentHomeowner?.homeowner)) {
        setAlertMessage(SUSPENDED_HOMEOWNER_REQUEST_MESSAGE);
        setIsAlertOpen(true);
        return;
      }
    } catch (error) {
      console.error("Homeowner status check failed:", error);
    }

    const workerId = String(worker?._id || worker?.id || "");

    // Pre-check active booking limits for homeowner
    try {
      const res = await homeownerAPI.listServiceRequests();
      const allRequests = Array.isArray(res?.items) ? res.items : [];
      const activeRequests = allRequests.filter((item: any) =>
        ["PENDING", "ONGOING", "ACCEPTED", "IN_PROGRESS"].includes(String(item?.status || "").toUpperCase())
      );

      if (activeRequests.length >= 10) {
        setAlertMessage("You have reached the maximum limit of 10 active bookings across skilled workers. You can only request new bookings once current active bookings are completed or done.");
        setIsAlertOpen(true);
        return;
      }

      const activeWithTarget = activeRequests.filter((item: any) => {
        const wId = String(item?.targetWorkerId?._id || item?.targetWorkerId || item?.worker?.id || item?.worker?._id || "");
        return wId === workerId;
      });

      if (activeWithTarget.length >= 3) {
        setAlertMessage("You can only have up to 3 active bookings with this worker. Please wait until existing bookings are completed.");
        setIsAlertOpen(true);
        return;
      }

      const activeSchedules = activeWithTarget.map((item: any) => ({
        preferredDate: String(item?.preferredDate || item?.scheduledAt || "").slice(0, 10),
        preferredTime: String(item?.preferredTime || "").trim(),
      }));
      setActiveWorkerBookings(activeSchedules);
    } catch (err) {
      console.warn("Could not pre-check active booking limits:", err);
    }

    const services = parseWorkerServices(worker.raw || worker);
    setSelectedWorkerServices(services);

    selectedWorkerRef.current = worker;
    setSelectedWorker(worker);
    setSelectedWorkerId(workerId || null);
    setSelectedWorkerName(worker.name);
    if (services.length === 1) {
      setSelectedWorkerRole(services[0]);
    } else {
      setSelectedWorkerRole(selectedService && services.includes(selectedService) ? selectedService : "");
    }
    setRequestDescription("");
    setContactNumber("");
    setServiceCity(normalizePangasinanMunicipality(selectedLocation || urlLocation));
    setServiceBarangay("");
    setServiceLocation("");
    setPreferredDate("");
    setPreferredTime("00:00");
    setPriceAgreementChecked(false);
    setShowRequestValidation(false);
    setIsRequestModalOpen(true);
  };

  const handleSendRequest = async () => {
    if (bookingSendingRef.current || isBookingSending) return;
    setShowRequestValidation(true);
    const workerFromRef = selectedWorkerRef.current;
    const workerId = String(
      selectedWorkerId ||
      workerFromRef?._id ||
      workerFromRef?.id ||
      selectedWorker?._id ||
      selectedWorker?.id ||
      ""
    );
    if (!workerId) {
      setAlertMessage("Please choose a worker before sending your request.");
      setIsAlertOpen(true);
      return;
    }
    if (!String(requestDescription || "").trim()) {
      setAlertMessage("Please add a short description before sending.");
      setIsAlertOpen(true);
      return;
    }
    const locationValidation = validateServiceRequestLocation({
      contactNumber,
      city: serviceCity,
      barangay: serviceBarangay,
      address: serviceLocation,
    });
    if (locationValidation.error) {
      setAlertMessage(locationValidation.error);
      setIsAlertOpen(true);
      return;
    }
    const requestLocation = locationValidation.value;
    if (selectedWorkerServices.length > 1 && !selectedWorkerRole) {
      setAlertMessage("Please choose the service you need before continuing.");
      setIsAlertOpen(true);
      return;
    }
    if (!preferredDate) {
      setAlertMessage("Please select a date for the service.");
      setIsAlertOpen(true);
      return;
    }
    if (!preferredTime) {
      setAlertMessage("Please select a time for the service.");
      setIsAlertOpen(true);
      return;
    }

    if (activeWorkerBookings && activeWorkerBookings.length > 0) {
      const isDup = activeWorkerBookings.some((b) => {
        const bDate = String(b.preferredDate || "").slice(0, 10);
        const bTime = String(b.preferredTime || "").trim();
        return bDate === preferredDate && bTime === preferredTime;
      });
      if (isDup) {
        setAlertMessage("You already have an active booking with this worker on this date and time. Please select another date or time.");
        setIsAlertOpen(true);
        return;
      }
    }

    const selected = new Date(preferredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxBookingDate = new Date(today);
    maxBookingDate.setDate(today.getDate() + 90);
    if (selected <= today) {
      setAlertMessage("Invalid Date: Service requests must be scheduled at least 1 day in advance (tomorrow onwards). Same-day bookings are not permitted.");
      setIsAlertOpen(true);
      return;
    }
    if (selected > maxBookingDate) {
      setAlertMessage("Invalid Date: Bookings can only be scheduled up to 90 days in advance. Dates beyond 90 days are locked and will unlock as days go by.");
      setIsAlertOpen(true);
      return;
    }

    if (!priceAgreementChecked) {
      setAlertMessage("Please agree to the price variation terms before submitting your request.");
      setIsAlertOpen(true);
      return;
    }

    setPreparedRequestLocation(requestLocation);
    setIsProofreadOpen(true);
  };

  const handleConfirmBookingSubmit = async () => {
    const workerFromRef = selectedWorkerRef.current;
    const workerId = String(
      selectedWorkerId ||
      selectedWorker?._id ||
      selectedWorker?.id ||
      ""
    );
    if (!workerId) return;
    if (bookingSendingRef.current || isBookingSending) return;

    const requestLocation =
      preparedRequestLocation ||
      validateServiceRequestLocation({
        contactNumber,
        city: serviceCity,
        barangay: serviceBarangay,
        address: serviceLocation,
      }).value;

    bookingSendingRef.current = true;
    setIsBookingSending(true);
    try {
      const resp = await homeownerAPI.createServiceRequest({
        targetWorkerId: workerId,
        description: requestDescription.trim(),
        preferredDate,
        preferredTime,
        serviceType: selectedWorkerRole || selectedService || "General Repair",
        ...requestLocation,
      });

      setSubmittedServiceLocation(formatServiceRequestAddress(
        resp?.request?.location || requestLocation.location,
        resp?.request?.address || requestLocation.address
      ));
      setSubmittedContactNumber(String(resp?.request?.contactNumber || requestLocation.contactNumber));
      setIsProofreadOpen(false);
      setIsRequestModalOpen(false);
      setIsSuccessOpen(true);
      setRequestDescription("");
      setSelectedWorkerId(workerId);
      setSelectedWorker(null);
      selectedWorkerRef.current = workerFromRef || selectedWorker || null;
      setSelectedWorkerRole("");
      setContactNumber("");
      setServiceCity("");
      setServiceBarangay("");
      setServiceLocation("");
      setPreferredDate("");
      setPreferredTime("00:00");
      setShowRequestValidation(false);
      setPreparedRequestLocation(null);
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 401) {
        clearHomeownerSession();
        savePendingServiceRequest({
          targetWorkerId: workerId,
          description: requestDescription.trim(),
          preferredDate,
          preferredTime,
          serviceType: selectedWorkerRole || selectedService || "General Repair",
          ...requestLocation,
        });
        navigate("/login", { replace: true });
        return;
      }

      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Unable to send request.";
      setAlertMessage(String(message));
      setIsAlertOpen(true);
    } finally {
      bookingSendingRef.current = false;
      setIsBookingSending(false);
    }
  };

  const headerService = urlService ? `${urlService}s` : "All Workers";
  const headerLocation = urlLocation ? `near ${urlLocation}` : "near you";

  return (
    <div className="w-full min-h-screen bg-[#F9F6F2] text-[#0B3B68] font-sans flex flex-col overflow-hidden select-none">
      <Navbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-6 py-6 h-full min-h-0">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full border border-gray-200 bg-white text-[#0B3B68] flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
            aria-label="Go back"
          >
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
          </button>
        </div>

        <div onClick={scrollToTop}>
          <WorkerSearchBar
            service={selectedService}
            location={locationSelectValue}
            serviceOptions={serviceOptions}
            locationOptions={locationOptions}
            onServiceChange={setSelectedService}
            onLocationChange={setSelectedLocation}
            onSearch={handleUpdateSearch}
          />
        </div>

        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div>
            <h3 className="text-xl font-bold text-[#0B3B68]">
              {headerService} <span className="text-[#0B3B68]">near</span>{" "}
              <span className="text-[#00AF91]">{headerLocation.replace("near ", "")}</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredWorkers.length} worker{filteredWorkers.length !== 1 ? "s" : ""}
            </p>
            {errorMessage && <p className="text-xs text-red-500 mt-1">{errorMessage}</p>}
          </div>
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => navigate(`/map${currentParams}`)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#0B3B68] text-white shadow-sm"
            >
              <MapIcon className="w-4 h-4" /> <span className="text-sm font-bold">Map</span>
            </button>
            <button
              onClick={() => navigate(`/list${currentParams}`)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-md text-gray-500 hover:bg-gray-50 transition"
            >
              <ListIcon className="w-4 h-4" /> <span className="text-sm font-bold">List</span>
            </button>
          </div>
        </div>
        <div className="pb-20 relative h-full">
          <div className="h-[720px] sticky top-24 bg-white rounded-3xl overflow-hidden border-4 border-white shadow-xl z-0 relative">
            <MapContainer
              center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
              zoom={zoom}
              zoomControl={false}
              scrollWheelZoom
              className="h-full w-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <MapFitController points={mapPoints} />
              {mapWorkers.map((worker) => {
                const liveStatus = getWorkerLiveStatus(worker.workingSchedule || "", worker.availabilityStatus || "");
                const availabilityStyle = getWorkerAvailabilityStyle(liveStatus.label);
                return (
                  <Marker
                    key={worker.id}
                    position={[worker.coords.lat, worker.coords.lng]}
                    icon={getMarkerIcon(worker)}
                  >
                    <Popup closeButton={false} className="th-map-popup">
                      <div className="w-64 rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="flex gap-3 p-3">
                          <img src={worker.image} alt={worker.name} className="w-12 h-12 rounded-xl object-cover" />
                          <div className="flex-1">
                            <p className="text-sm font-bold text-[#0B3B68]">{worker.name}</p>
                            <p className="text-[11px] text-gray-500">{worker.role}</p>
                            <div className="mt-1">
                              <span className={availabilityStyle.pillClassName}>
                                <span className={`w-2 h-2 rounded-full ${availabilityStyle.dotClassName}`} />
                                {liveStatus.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {worker.barangay && worker.city
                                ? `${worker.barangay}, ${worker.city}`
                                : worker.locationLabel}
                            </p>
                          </div>
                        </div>
                        <div className="px-3 pb-3">
                          <div className="flex items-center gap-2 text-[11px] text-yellow-700 font-semibold">
                            <span>★ {worker.rating.toFixed(1)}</span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => navigate(`/profile/${worker.id}`, { state: { worker } })}
                              className="flex-1 px-3 py-2 text-[11px] font-bold text-[#0B3B68] border border-[#0B3B68] rounded-lg hover:bg-[#0B3B68] hover:text-white transition-all"
                            >
                              View Profile
                            </button>
                            <button
                              onClick={() => { void openRequestModal(worker); }}
                              className="flex-1 px-3 py-2 text-[11px] font-bold text-white bg-[#00AF91] rounded-lg hover:bg-[#009b80] transition-all"
                            >
                              Request Service
                            </button>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>

            <div className="absolute bottom-6 right-6 flex flex-col shadow-lg rounded-lg overflow-hidden bg-white z-[2000]">
              <button
                onClick={() => setZoom((value) => Math.min(value + 1, 18))}
                className="p-3 border-b border-gray-100 text-[#0B3B68] hover:bg-gray-50"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setZoom((value) => Math.max(value - 1, 10))}
                className="p-3 text-[#0B3B68] hover:bg-gray-50"
              >
                <MinusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {isRequestModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsRequestModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <button
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors active:scale-90"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-[#111] dark:text-white mb-2">Request Service</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6 text-sm">
              Fill in details for <span className="text-[#00AF91] font-bold">{selectedWorkerName}</span>
            </p>

            <ServiceRequestContactLocationFields
              serviceType={selectedWorkerRole}
              onServiceTypeChange={setSelectedWorkerRole}
              workerServices={selectedWorkerServices}
              contactNumber={contactNumber}
              city={serviceCity}
              barangay={serviceBarangay}
              address={serviceLocation}
              description={requestDescription}
              preferredDate={preferredDate}
              preferredTime={preferredTime}
              showValidationErrors={showRequestValidation}
              priceAgreementChecked={priceAgreementChecked}
              onPriceAgreementChange={setPriceAgreementChecked}
              onContactNumberChange={setContactNumber}
              onCityChange={setServiceCity}
              onBarangayChange={setServiceBarangay}
              onAddressChange={setServiceLocation}
              onDescriptionChange={setRequestDescription}
              onPreferredDateChange={setPreferredDate}
              onPreferredTimeChange={setPreferredTime}
              activeWorkerBookings={activeWorkerBookings}
            />

            <button
              className="w-full bg-[#00AF91] text-white py-3.5 rounded-full font-bold text-lg hover:bg-[#009b80] transition-all active:scale-[0.98] shadow-md shadow-[#00AF91]/20 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleSendRequest}
              disabled={isBookingSending}
            >
              {isBookingSending ? "Sending Request..." : "Send Request"}
              {!isBookingSending ? <SearchIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> : null}
            </button>

            <div className="flex gap-2 items-start text-[11px] text-gray-500 dark:text-slate-400 mt-4 italic">
              <LockIcon className="w-3 h-3 mt-0.5" /> Security Tip: Contact details are shared after the worker confirms availability.
            </div>
          </div>
        </div>
      )}

      {isAlertOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setIsAlertOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 w-full max-w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-90 duration-300">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <LockIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Wait a moment</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">{alertMessage}</p>
            <button
              className="w-full bg-[#0B3B68] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#154875] transition-all active:scale-95 shadow-lg shadow-blue-900/10 cursor-pointer"
              onClick={() => setIsAlertOpen(false)}
            >
              Okay, I&apos;ll check
            </button>
          </div>
        </div>
      )}

      <ServiceRequestProofreadModal
        isOpen={isProofreadOpen}
        workerName={selectedWorker?.name || selectedWorkerRef.current?.name || "Worker"}
        workerRole={selectedWorkerRole || selectedWorker?.role || selectedService || "General Repair"}
        workerAvatar={selectedWorker?.image || selectedWorkerRef.current?.image || ""}
        serviceType={selectedWorkerRole || selectedWorker?.role || selectedService || "General Repair"}
        description={requestDescription}
        preferredDate={preferredDate}
        preferredTime={preferredTime}
        contactNumber={contactNumber}
        city={serviceCity}
        barangay={serviceBarangay}
        address={serviceLocation}
        isSubmitting={isBookingSending}
        onConfirm={() => void handleConfirmBookingSubmit()}
        onEdit={() => setIsProofreadOpen(false)}
        onClose={() => setIsProofreadOpen(false)}
      />

      <ServiceRequestSuccessModal
        isOpen={isSuccessOpen}
        location={submittedServiceLocation}
        contactNumber={submittedContactNumber}
        onClose={() => setIsSuccessOpen(false)}
        onViewRequests={() => {
          setIsSuccessOpen(false);
          navigate("/homeowner-bookings", { replace: true });
        }}
      />
    </div>
  );
}

