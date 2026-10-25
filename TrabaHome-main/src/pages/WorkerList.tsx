// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Navbar from "../components/requestpages/Navbar";
import ServiceRequestSuccessModal from "../components/requestpages/ServiceRequestSuccessModal.tsx";
import ServiceRequestProofreadModal from "../components/requestpages/ServiceRequestProofreadModal.tsx";
import ServiceRequestContactLocationFields from "../components/requestpages/ServiceRequestContactLocationFields.tsx";
import {
  homeownerAPI,
  SUSPENDED_HOMEOWNER_REQUEST_MESSAGE,
  isSuspendedHomeownerAccount,
} from "../services/HomeownerApi.ts";
import { readJsonCache, writeJsonCache } from "../services/pageCache.ts";
import { savePendingServiceRequest } from "../services/pendingServiceRequest.ts";
import { clearHomeownerSession } from "../utils/homeownerAuth.ts";
import { normalizePangasinanMunicipality } from "../constants/SignUpData.ts";
import { getProfessionIcon } from "../constants/featuredServicesData.ts";
import { formatServiceRequestAddress, parseWorkerServices, validateServiceRequestLocation } from "../utils/serviceRequestForm.ts";
import { useCachedResource } from "../services/useCachedResource.ts";
import { getWorkerAvailabilityStyle, getWorkerLiveStatus } from "../utils/workerAvailability.ts";
import { useMinuteTicker } from "../hooks/useMinuteTicker.ts";
import { 
  MapIcon, ListIcon, HammerIcon, TrowelIcon, 
  DropletIcon, ZapIcon, BrushIcon, SproutIcon, WrenchIcon,
  SearchIcon, MapPinIcon, ChevronDownIcon, StarIcon, ShieldCheckIcon, ArrowRightIcon,
  XIcon, LockIcon
} from "../Icons";

const viteEnv = import.meta.env || {};
const API_BASE_URL = viteEnv.VITE_API_BASE_URL || "http://localhost:8000/api";
const WORKER_API_PREFIXES = [`${API_BASE_URL}/workers`, `${API_BASE_URL}/worker`];
const WORKER_LIST_CACHE_TTL_MS = 15 * 1000;
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

const normalizeWorker = (item) => {
  if (!item) return null;
  const id = item._id || item.id;
  if (!id) return null;
  const firstName = (item.firstName || "").trim();
  const lastName = (item.lastName || "").trim();
  const name =
    [firstName, lastName].filter(Boolean).join(" ") ||
    item.name ||
    item.fullName ||
    item.email ||
    "Worker";
  const role = item.profession || item.role || item.service || item.category || "General Repair";
  const location = item.city || item.location || item.area || item.barangay || "Location";
  const ratingValue = item.rating ?? item.averageRating ?? item.score ?? 0;
  const rating = Number.isFinite(Number(ratingValue)) ? Number(ratingValue) : 0;
  const barangay = String(item.barangay || "").trim();
  const city = String(item.city || "").trim();
  const availabilityStatus = String(item.availabilityStatus || item.availability?.status || "").trim();
  const workingSchedule = String(item.workingSchedule || item.availability?.schedule || "").trim();
  const exp =
    item.exp ||
    item.experience ||
    item.about ||
    item.bio ||
    `Experienced ${String(role).toLowerCase()} available in ${location}.`;
  const image =
    item.avatar ||
    item.profileImage ||
    item.image ||
    item.photo ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  const liveStatus = getWorkerLiveStatus(workingSchedule, availabilityStatus);

  return { id, name, role, location, rating, image, exp, barangay, city, availabilityStatus, workingSchedule, liveStatus };
};

export default function WorkerList() {
  useMinuteTicker();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const urlService = searchParams.get("service") || "";
  const urlLocation = searchParams.get("location") || "";
  const currentParams = location.search;
  const workerListCacheKey = `trabahome_worker_list:${currentParams || "default"}`;
  const cachedWorkers = readJsonCache<any[]>(workerListCacheKey, WORKER_LIST_CACHE_TTL_MS) || [];
  const {
    value: fetchedWorkers,
    isLoading,
    error: resourceError,
    refresh,
  } = useCachedResource<any[]>({
    cacheKey: workerListCacheKey,
    ttlMs: WORKER_LIST_CACHE_TTL_MS,
    enabled: true,
    load: async () => {
      const data = await fetchWithFallback("");
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
          ? data.items
        : Array.isArray(data)
          ? data
          : [];
      return items.map(normalizeWorker).filter(Boolean);
    },
  });
  const workers = fetchedWorkers ?? cachedWorkers;

  useEffect(() => {
    const handleSync = () => {
      try {
        localStorage.removeItem(workerListCacheKey);
      } catch {}
      void refresh()?.catch(() => {});
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
      window.removeEventListener("trabahome:worker-changed", handleSync);
      window.removeEventListener("trabahome:user-registered", handleSync);
      window.removeEventListener("trabahome:dashboard-refresh", handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, [workerListCacheKey, refresh]);

  const [selectedService, setSelectedService] = useState(urlService);
  const [selectedLocation, setSelectedLocation] = useState(urlLocation);

  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProofreadOpen, setIsProofreadOpen] = useState(false);
  const [preparedRequestLocation, setPreparedRequestLocation] = useState<any>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [isBookingSending, setIsBookingSending] = useState(false);
  const bookingSendingRef = useRef(false);
  const [showRequestValidation, setShowRequestValidation] = useState(false);
  const [priceAgreementChecked, setPriceAgreementChecked] = useState(false);
  
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
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

  const handleBack = () => {
    if (typeof window === "undefined") return;
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  useEffect(() => {
    setSelectedService(urlService);
    setSelectedLocation(urlLocation);
  }, [urlService, urlLocation]);

  const uniqueServices = useMemo(() => [...new Set(workers.map(w => w.role))].sort(), [workers]);
  const uniqueLocations = useMemo(() => [...new Set(workers.map(w => w.location))].sort(), [workers]);

    const filteredWorkers = workers.filter((worker) => {
    const normalizedService = String(urlService || "").trim().toLowerCase();
    const normalizedLocation = String(urlLocation || "").trim().toLowerCase();
    const workerRole = String(worker?.role || "").toLowerCase();
    const workerLocation = String(worker?.location || "").toLowerCase();
    const matchesService =
      !normalizedService ||
      workerRole.includes(normalizedService) ||
      normalizedService.includes(workerRole) ||
      (normalizedService.includes("clean") && workerRole.includes("clean")) ||
      (normalizedService.includes("repair") && (workerRole.includes("repair") || workerRole.includes("handyman"))) ||
      (normalizedService.includes("handyman") && (workerRole.includes("repair") || workerRole.includes("handyman"))) ||
      (normalizedService.includes("mason") && workerRole.includes("mason"));
    const matchesLocation =
      !normalizedLocation ||
      workerLocation.includes(normalizedLocation) ||
      normalizedLocation.includes(workerLocation);
    return matchesService && matchesLocation;
  });

  const handleUpdateSearch = () => {
    navigate(`/list?service=${selectedService}&location=${selectedLocation}`, { replace: true });
  };

  const getRoleIcon = (role) => {
    return getProfessionIcon(role, "w-3 h-3");
  };

  const openRequestModal = async (workerId, workerName, workerRole, workerObj = null) => {
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

    const targetId = String(workerId || "");

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
        return wId === targetId;
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

    const rawWorker = workerObj || (workers as any[]).find((w) => String(w.id) === targetId)?.raw || { role: workerRole, name: workerName };
    const services = parseWorkerServices(rawWorker);
    setSelectedWorkerServices(services);

    setSelectedWorkerId(workerId);
    setSelectedWorkerName(workerName);
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
    setShowRequestValidation(false);
    setIsModalOpen(true);
  };

  const handleSendRequest = async () => {
    if (bookingSendingRef.current || isBookingSending) return;
    setShowRequestValidation(true);
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
    if (!selectedWorkerId) {
      setAlertMessage("Please choose a worker before sending your request.");
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
        setAlertMessage("You already have an active booking with this worker on this date and time. Please choose another date or time.");
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
    if (bookingSendingRef.current || isBookingSending) return;
    const requestLocation = preparedRequestLocation || validateServiceRequestLocation({
      contactNumber,
      city: serviceCity,
      barangay: serviceBarangay,
      address: serviceLocation,
    }).value;

    bookingSendingRef.current = true;
    setIsBookingSending(true);
    try {
      const resp = await homeownerAPI.createServiceRequest({
        targetWorkerId: String(selectedWorkerId),
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
      setIsModalOpen(false);
      setIsSuccessOpen(true);
      setRequestDescription("");
      setPreferredDate("");
      setPreferredTime("00:00");
      setShowRequestValidation(false);
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401) {
        clearHomeownerSession();
        savePendingServiceRequest({
          targetWorkerId: String(selectedWorkerId),
          description: requestDescription.trim(),
          preferredDate,
          preferredTime,
          serviceType: selectedWorkerRole || selectedService || "General Repair",
          ...requestLocation,
        });
        setAlertMessage("Your homeowner session expired. We saved this request draft. Please sign in again to send it.");
        setIsAlertOpen(true);
        setIsProofreadOpen(false);
        navigate("/login", { replace: true });
        return;
      }
      const backendMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to send request. Please try again later.";
      setAlertMessage(backendMessage);
      setIsAlertOpen(true);
      console.error("Service request create error:", error);
    } finally {
      bookingSendingRef.current = false;
      setIsBookingSending(false);
    }
  };

  const headerService = urlService ? `${urlService}s` : "All Workers";
  const headerLocation = urlLocation ? `near ${urlLocation}` : "near you";

  return (
    <div className={`w-full min-h-screen bg-[#F9F6F2] text-[#0B3B68] font-sans flex flex-col relative animate-in fade-in duration-1000 ${isModalOpen || isSuccessOpen || isAlertOpen ? 'overflow-hidden' : ''}`}>
      <Navbar />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 h-full">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 rounded-full border border-gray-200 bg-white text-[#0B3B68] flex items-center justify-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowRightIcon className="w-4 h-4 rotate-180" />
          </button>
        </div>
        <div className="bg-white p-2 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 mb-8 border border-gray-100 items-center transform transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
          <div className="flex-1 flex items-center px-4 py-2 border border-gray-200 rounded-xl bg-white relative w-full focus-within:border-[#00AF91] focus-within:ring-4 focus-within:ring-[#00AF91]/10 transition-all">
            <HammerIcon className="w-5 h-5 text-[#0B3B68] mr-3" />
            <select className="w-full bg-transparent outline-none text-[#0B3B68] font-bold appearance-none cursor-pointer" value={selectedService} onChange={(e) => setSelectedService(e.target.value)}>
              <option value="">All Services</option>
              {uniqueServices.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
          </div>
          <div className="flex-1 flex items-center px-4 py-2 border border-gray-200 rounded-xl bg-white relative w-full focus-within:border-[#00AF91] focus-within:ring-4 focus-within:ring-[#00AF91]/10 transition-all">
            <MapPinIcon className="w-5 h-5 text-[#0B3B68] mr-3" />
            <select className="w-full bg-transparent outline-none text-[#0B3B68] font-bold appearance-none cursor-pointer" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
              <option value="">All Locations</option>
              {uniqueLocations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
          </div>
          <button onClick={handleUpdateSearch} className="bg-[#0B3B68] text-white w-full md:w-auto px-8 py-3 md:py-2 rounded-xl font-bold hover:bg-[#154875] transition-all shadow-md min-w-[120px] h-full active:scale-95 transform cursor-pointer">Search</button>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-end mb-6 gap-4">
          <div className="animate-in slide-in-from-left duration-700">
            <h3 className="text-xl font-bold text-[#0B3B68]">{headerService} <span className="text-[#0B3B68]">near</span> <span className="text-[#00AF91]">{headerLocation.replace('near ', '')}</span></h3>
            <p className="text-sm text-gray-500 mt-1">Showing {filteredWorkers.length} workers</p>
            {resourceError && (
              <p className="text-xs text-red-500 mt-1">{resourceError}</p>
            )}
          </div>

          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 transition-all hover:shadow-md">
            <button onClick={() => navigate(`/map${currentParams}`)} className="flex items-center gap-2 px-4 py-1.5 rounded-md text-gray-500 hover:bg-gray-50 transition-all active:scale-95">
                <MapIcon className="w-4 h-4" /> <span className="text-sm font-bold">Map</span>
            </button>
            <button onClick={() => navigate(`/search${currentParams}`)} className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#0B3B68] text-white shadow-sm transition-all active:scale-95">
                <ListIcon className="w-4 h-4" /> <span className="text-sm font-bold">List</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {isLoading ? (
            // --- SKELETON LOADING VIEW ---
            [1,2,3,4].map(n => (
              <div key={n} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-5 animate-pulse">
                <div className="w-full sm:w-32 h-32 bg-gray-200 rounded-xl"></div>
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="flex gap-2 pt-2"><div className="h-8 bg-gray-100 rounded-full w-full"></div><div className="h-8 bg-gray-100 rounded-full w-full"></div></div>
                </div>
              </div>
            ))
          ) : filteredWorkers.length > 0 ? (
            filteredWorkers.map((worker, idx) => {
              const liveStatus = getWorkerLiveStatus(worker.workingSchedule || "", worker.availabilityStatus || "");
              const availabilityStyle = getWorkerAvailabilityStyle(liveStatus.label);
              return (
              <div 
                key={worker.id} 
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-2xl hover:scale-[1.02] hover:border-[#00AF91]/40 transition-all duration-500 flex flex-col sm:flex-row gap-5 group animate-in slide-in-from-bottom duration-700"
                style={{ animationDelay: `${idx * 75}ms`, animationFillMode: 'both' }}
              >
                <div
                  className="w-full sm:w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-200 cursor-pointer relative"
                  onClick={() => navigate(`/profile/${worker.id}`, { state: { worker } })}
                >
                  <img src={worker.image} alt={worker.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500" />
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3
                        className="text-lg font-bold text-[#0B3B68] flex items-center gap-1 cursor-pointer hover:text-[#00AF91] transition-colors duration-300"
                        onClick={() => navigate(`/profile/${worker.id}`, { state: { worker } })}
                      >
                        {worker.name} <ShieldCheckIcon className="w-4 h-4 text-blue-500" />
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="bg-blue-50 text-[#0B3B68] text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1 border border-blue-100 group-hover:bg-[#0B3B68] group-hover:text-white transition-all duration-500">{getRoleIcon(worker.role)} {worker.role}</span>
                        <div className="flex items-center text-yellow-500 text-xs font-bold"><StarIcon className="w-3 h-3 mr-1 animate-pulse" /> {worker.rating}</div>
                      </div>
                      <div className="mt-2">
                        <span className={availabilityStyle.pillClassName}>
                          <span className={`w-2 h-2 rounded-full ${availabilityStyle.dotClassName}`} />
                          {liveStatus.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wide">Available near you</p>
                  <div className="mt-1"><span className="inline-block bg-[#D6EFE8] text-[#00AF91] text-xs font-bold px-2 py-0.5 rounded-full border border-[#BDE5DB]">{worker.location} area</span></div>
                  <p className="text-xs text-gray-500 mt-3 italic line-clamp-1">"{worker.exp}"</p>
                  
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => navigate(`/profile/${worker.id}`, { state: { worker } })}
                      className="flex-1 px-3 py-1.5 border border-[#0B3B68] text-[#0B3B68] text-xs font-bold rounded-xl hover:bg-[#0B3B68] hover:text-white transition-all duration-300 active:scale-95"
                    >
                      View Profile
                    </button>
                    <button onClick={() => { void openRequestModal(worker.id, worker.name, worker.role, worker.raw || worker); }} className="flex-1 px-3 py-1.5 bg-[#00AF91] text-white text-xs font-bold rounded-xl hover:bg-[#009b80] hover:shadow-lg hover:shadow-[#00AF91]/30 transition-all duration-300 shadow-sm active:scale-95">Request Service</button>
                  </div>
                </div>
              </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 animate-pulse">
              <h3 className="text-xl font-bold text-gray-400">No results found</h3>
              <p className="text-gray-400 mt-2">Try selecting "All Services" or "All Locations".</p>
            </div>
          )}
        </div>
      </main>

      {/* --- INPUT MODAL (Enhanced UI) --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors active:scale-90">
                <XIcon className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-[#111] dark:text-white mb-2">Request Service</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-6 text-sm">Fill in details for <span className="text-[#00AF91] font-bold">{selectedWorkerName}</span></p>

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

            <button className="w-full bg-[#00AF91] text-white py-3.5 rounded-full font-bold text-lg hover:bg-[#009b80] transition-all active:scale-[0.98] shadow-md shadow-[#00AF91]/20 flex items-center justify-center gap-2 group disabled:cursor-not-allowed disabled:opacity-60" onClick={handleSendRequest} disabled={isBookingSending}>
              {isBookingSending ? "Sending Request..." : "Send Request"}
              {!isBookingSending && <SearchIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="flex gap-2 items-start text-[11px] text-gray-500 dark:text-slate-400 mt-4 italic">
                <LockIcon className="w-3 h-3 mt-0.5" /> Security Tip: Contact details shared after worker confirms availability.
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM ALERT MODAL (Enhanced UI) --- */}
      {isAlertOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setIsAlertOpen(false)}></div>
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
              Okay, I'll check
            </button>
          </div>
        </div>
      )}

      <ServiceRequestProofreadModal
        isOpen={isProofreadOpen}
        workerName={selectedWorkerName || "Skilled Worker"}
        workerRole={selectedWorkerRole || selectedService || "General Repair"}
        serviceType={selectedWorkerRole || selectedService || "General Repair"}
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
