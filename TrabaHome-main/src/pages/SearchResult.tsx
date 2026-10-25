// @ts-nocheck
import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  BellIcon, MapIcon, ListIcon, HammerIcon, TrowelIcon, 
  DropletIcon, ZapIcon, BrushIcon, SproutIcon, WrenchIcon,
  SearchIcon, MapPinIcon, ChevronDownIcon, StarIcon, PlusIcon, 
  MinusIcon, ShieldCheckIcon, ClockIcon, CalendarIcon, LockIcon, XIcon,
  ArrowRightIcon
} from "../Icons";
import ServiceRequestProofreadModal from "../components/requestpages/ServiceRequestProofreadModal.tsx";
import ServiceRequestSuccessModal from "../components/requestpages/ServiceRequestSuccessModal.tsx";
import ServiceRequestContactLocationFields from "../components/requestpages/ServiceRequestContactLocationFields.tsx";
import {
  homeownerAPI,
  SUSPENDED_HOMEOWNER_REQUEST_MESSAGE,
  isSuspendedHomeownerAccount,
} from "../services/HomeownerApi.ts";
import { clearHomeownerSession } from "../utils/homeownerAuth.ts";
import { savePendingServiceRequest } from "../services/pendingServiceRequest.ts";
import { normalizePangasinanMunicipality, professionOptions } from "../constants/SignUpData.ts";
import { getProfessionIcon } from "../constants/featuredServicesData.ts";
import { formatServiceRequestAddress, parseWorkerServices, validateServiceRequestLocation } from "../utils/serviceRequestForm.ts";
import { getWorkerLiveStatus } from "../utils/workerAvailability.ts";
import Navbar from "../components/requestpages/Navbar.jsx";

const viteEnv = import.meta.env || {};
const API_BASE_URL = viteEnv.VITE_API_BASE_URL || "http://localhost:8000/api";
const WORKER_API_PREFIXES = [`${API_BASE_URL}/workers`, `${API_BASE_URL}/worker`];

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
  const id = String(item._id || item.id || "");
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
  const location = item.city || item.location || item.area || item.barangay || "Pangasinan";
  const ratingValue = item.rating ?? item.averageRating ?? item.score ?? 0;
  const rating = Number.isFinite(Number(ratingValue)) && Number(ratingValue) > 0 ? Number(ratingValue) : 4.8;
  const barangay = String(item.barangay || "").trim();
  const city = String(item.city || item.location || "").trim();
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
    item.profilePhotoUrl ||
    item.image ||
    item.photo ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
  const liveStatus = getWorkerLiveStatus(workingSchedule, availabilityStatus);

  return {
    id,
    name,
    role,
    location,
    rating,
    image,
    exp,
    barangay,
    city,
    availabilityStatus,
    workingSchedule,
    liveStatus,
    raw: item,
  };
};

export default function SearchResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  
  const urlService = searchParams.get("service") || "";
  const urlLocation = searchParams.get("location") || "";
  const currentParams = location.search;

  const [selectedService, setSelectedService] = useState(urlService);
  const [selectedLocation, setSelectedLocation] = useState(urlLocation);

  const [workers, setWorkers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- ZOOM & DRAG STATE ---
  const [zoom, setZoom] = useState(1); 
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapRef = useRef(null);

  // --- MODAL STATES ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProofreadOpen, setIsProofreadOpen] = useState(false);
  const [preparedRequestLocation, setPreparedRequestLocation] = useState(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false); 
  const [isAlertOpen, setIsAlertOpen] = useState(false); 
  const [alertMessage, setAlertMessage] = useState(""); 
  const [isBookingSending, setIsBookingSending] = useState(false);
  const bookingSendingRef = useRef(false);
  const [showRequestValidation, setShowRequestValidation] = useState(false);
  const [priceAgreementChecked, setPriceAgreementChecked] = useState(false);

  // Selected Worker & Booking Fields
  const [selectedWorkerId, setSelectedWorkerId] = useState(null);
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

  const loadWorkers = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await fetchWithFallback("");
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
          ? data.items
        : Array.isArray(data)
          ? data
          : [];
      const normalized = items.map(normalizeWorker).filter(Boolean);
      setWorkers(normalized);
    } catch (err) {
      console.error("Failed to load workers in SearchResults:", err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkers();

    const handleSync = () => {
      loadWorkers(true);
    };

    window.addEventListener("trabahome:worker-changed", handleSync);
    window.addEventListener("trabahome:user-registered", handleSync);
    window.addEventListener("trabahome:dashboard-refresh", handleSync);

    const handleStorage = (e) => {
      if (e.key === "trabahome_sync_worker" || (e.key && e.key.startsWith("trabahome_worker_list"))) {
        loadWorkers(true);
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("trabahome:worker-changed", handleSync);
      window.removeEventListener("trabahome:user-registered", handleSync);
      window.removeEventListener("trabahome:dashboard-refresh", handleSync);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    setSelectedService(urlService);
    setSelectedLocation(urlLocation);
  }, [urlService, urlLocation]);

  // --- MOUSE WHEEL ZOOM HANDLER ---
  useEffect(() => {
    const mapContainer = mapRef.current;
    if (!mapContainer) return;

    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.2 : 0.2;
      setZoom(prev => {
        const newZoom = Math.min(Math.max(prev + delta, 1), 5);
        if (newZoom === 1) setPosition({ x: 0, y: 0 });
        return newZoom;
      });
    };

    mapContainer.addEventListener("wheel", handleWheel, { passive: false });
    return () => mapContainer.removeEventListener("wheel", handleWheel);
  }, []);

  const defaultServices = professionOptions;
  const uniqueServices = useMemo(() => {
    const set = new Set([...defaultServices, ...workers.map(w => w.role).filter(Boolean)]);
    return [...set].sort();
  }, [workers]);

  const defaultLocations = ["Binmaley", "Calasiao", "Dagupan City", "Lingayen", "Mangaldan", "San Fabian", "San Carlos City", "Urdaneta City"];
  const uniqueLocations = useMemo(() => {
    const set = new Set([...defaultLocations, ...workers.map(w => w.location).filter(Boolean), ...workers.map(w => w.city).filter(Boolean)]);
    return [...set].sort();
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const s = urlService.trim().toLowerCase();
      const l = urlLocation.trim().toLowerCase();
      const wRole = String(worker.role || "").toLowerCase();
      const wLoc = String(worker.location || "").toLowerCase();
      const wCity = String(worker.city || "").toLowerCase();
      const wBarangay = String(worker.barangay || "").toLowerCase();

      const matchesService =
        !s ||
        wRole.includes(s) ||
        s.includes(wRole) ||
        (s.includes("clean") && wRole.includes("clean")) ||
        (s.includes("repair") && (wRole.includes("repair") || wRole.includes("handyman"))) ||
        (s.includes("handyman") && (wRole.includes("repair") || wRole.includes("handyman"))) ||
        (s.includes("mason") && wRole.includes("mason"));
      const matchesLocation = !l || wLoc.includes(l) || l.includes(wLoc) || wCity.includes(l) || l.includes(wCity) || wBarangay.includes(l);
      return matchesService && matchesLocation;
    });
  }, [workers, urlService, urlLocation]);

  const handleUpdateSearch = () => {
    navigate(`/search?service=${selectedService}&location=${selectedLocation}`, { replace: true });
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
    setPreparedRequestLocation(null);
    setShowRequestValidation(false);
    setIsModalOpen(true);
  };

  const handleSendRequest = () => {
    setShowRequestValidation(true);
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
        "Unable to send service request. Please try again.";
      setAlertMessage(backendMessage);
      setIsAlertOpen(true);
    } finally {
      bookingSendingRef.current = false;
      setIsBookingSending(false);
    }
  };

  // --- COORDINATES FOR PANGASINAN SCALE ---
  const cityCoordinates = {
    "Dagupan City": { top: "45%", left: "55%" },
    "Dagupan":      { top: "45%", left: "55%" },
    "Calasiao":     { top: "52%", left: "56%" },
    "Lingayen":     { top: "48%", left: "42%" },
    "Binmaley":     { top: "46%", left: "48%" },
    "San Fabian":   { top: "35%", left: "62%" },
    "Mangaldan":    { top: "43%", left: "61%" },
    "San Carlos City": { top: "58%", left: "52%" },
    "San Carlos":   { top: "58%", left: "52%" },
    "Malasiqui":    { top: "60%", left: "58%" },
    "Santa Barbara": { top: "50%", left: "59%" },
    "Urdaneta City": { top: "53%", left: "70%" },
    "Urdaneta":     { top: "53%", left: "70%" },
    "Bayambang":    { top: "66%", left: "57%" },
    "Alaminos City": { top: "45%", left: "28%" },
    "Alaminos":     { top: "45%", left: "28%" },
  };

  const getWorkerOffset = (id) => {
    let hash = 0;
    const str = String(id || "");
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return (Math.abs(hash) % 7) - 3;
  };

  const getMapPosition = (locationName, id) => {
    const base = cityCoordinates[locationName] || { top: "50%", left: "50%" };
    const offset = getWorkerOffset(id);
    const topVal = parseFloat(base.top) + offset * 0.7; 
    const leftVal = parseFloat(base.left) + offset * 0.7;
    return { top: `${topVal}%`, left: `${leftVal}%` };
  };

  // --- ZOOM & DRAG HANDLERS ---
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  const handleIconClick = (locationName, id) => {
    const pos = getMapPosition(locationName, id);
    const container = mapRef.current;
    if (!container) return;
    const { clientWidth, clientHeight } = container;
    const targetX = (clientWidth / 2) - (parseFloat(pos.left) / 100 * clientWidth);
    const targetY = (clientHeight / 2) - (parseFloat(pos.top) / 100 * clientHeight);
    setZoom(3);
    setPosition({ x: targetX * 3, y: targetY * 3 });
  };

  const headerService = urlService ? `${urlService}s` : "All Workers";
  const headerLocation = urlLocation ? `near ${urlLocation}` : "near you";

  return (
    <div className={`w-full min-h-screen bg-[#F9F6F2] text-[#0B3B68] font-sans flex flex-col select-none animate-in fade-in duration-1000 ${isModalOpen || isSuccessOpen || isAlertOpen ? 'overflow-hidden' : ''}`}>
      <Navbar logoRoute="/home" />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 h-full">
        {/* Search Bar Animation */}
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
            <p className="text-sm text-gray-500 mt-1">Showing {filteredWorkers.length} {urlService.toLowerCase() || 'worker'}s</p>
          </div>
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 transition-all hover:shadow-md">
            <button onClick={() => navigate(`/map${currentParams}`)} className="flex items-center gap-2 px-4 py-1.5 rounded-md text-gray-500 hover:bg-gray-50 transition-all active:scale-95">
              <MapIcon className="w-4 h-4" /> <span className="text-sm font-bold">Map</span>
            </button>
            <button onClick={() => navigate(`/list${currentParams}`)} className="flex items-center gap-2 px-4 py-1.5 rounded-md text-gray-500 hover:bg-gray-50 transition-all active:scale-95">
              <ListIcon className="w-4 h-4" /> <span className="text-sm font-bold">List</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-20 relative items-start h-full">
          {/* DRAGGABLE & ZOOMABLE MAP */}
          <div 
            ref={mapRef}
            className={`lg:col-span-5 h-[340px] sm:h-[450px] lg:h-[600px] static lg:sticky top-24 bg-[#D6EFE8] rounded-2xl sm:rounded-3xl overflow-hidden border-2 sm:border-4 border-white shadow-xl z-0 relative transition-transform duration-1000 animate-in zoom-in-95 ${zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div 
              className="absolute inset-0 transition-all duration-700 ease-out origin-center"
              style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})` }}
            >
              <iframe width="100%" height="100%" frameBorder="0" scrolling="no"
                src="https://www.openstreetmap.org/export/embed.html?bbox=119.7821,15.6500,120.9421,16.3000&layer=mapnik"
                className="opacity-70 pointer-events-none absolute inset-0 w-full h-full"
              ></iframe>
              {filteredWorkers.map((worker) => {
                const pos = getMapPosition(worker.location, worker.id);
                const pinColor = "#0B3B68"; 
                return (
                  <div 
                    key={worker.id} 
                    className="absolute group cursor-pointer z-10" 
                    style={{ 
                      top: pos.top, 
                      left: pos.left, 
                      transform: `translate(-50%, -100%) scale(${1/zoom})` 
                    }}
                    onClick={(e) => { e.stopPropagation(); handleIconClick(worker.location, worker.id); }}
                  >
                    <div className="relative flex flex-col items-center">
                      <div 
                        className="w-8 h-8 rounded-full shadow-lg flex items-center justify-center border-2 border-white transition-all duration-300 transform group-hover:-translate-y-1 text-white"
                        style={{ backgroundColor: pinColor }}
                      >
                        {getRoleIcon(worker.role)}
                      </div>
                      <div 
                        className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] -mt-[1px]"
                        style={{ borderTopColor: pinColor }}
                      ></div>
                    </div>
                    {/* Tooltip on Map hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0B3B68] text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-all transform pointer-events-none whitespace-nowrap shadow-lg">
                      {worker.name} â€¢ {worker.rating}â˜…
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Map Mini Controls */}
            <div className="absolute bottom-6 right-6 flex flex-col bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden z-20 border border-white/50">
               <button onClick={() => setZoom(prev => Math.min(prev + 0.5, 5))} className="p-3 border-b hover:bg-white transition-colors active:bg-gray-100"><PlusIcon className="w-4 h-4"/></button>
               <button onClick={() => { const newZ = Math.max(zoom - 0.5, 1); setZoom(newZ); if(newZ === 1) setPosition({x:0,y:0}) }} className="p-3 hover:bg-white transition-colors active:bg-gray-100"><MinusIcon className="w-4 h-4"/></button>
            </div>
          </div>

          <div className="lg:col-span-7 flex flex-col gap-5 animate-in slide-in-from-bottom duration-1000">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white p-5 rounded-2xl border border-gray-100 animate-pulse flex gap-6">
                    <div className="w-36 h-36 bg-gray-200 rounded-2xl shrink-0" />
                    <div className="flex-1 space-y-3 py-2">
                      <div className="h-5 bg-gray-200 rounded w-1/2" />
                      <div className="h-4 bg-gray-100 rounded w-1/3" />
                      <div className="h-8 bg-gray-100 rounded w-full mt-4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredWorkers.length > 0 ? (
              filteredWorkers.map((worker, idx) => (
                <div 
                  key={worker.id} 
                  className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-2xl hover:scale-[1.02] hover:border-[#00AF91]/40 transition-all duration-500 flex flex-col sm:flex-row gap-6 group"
                  style={{ 
                    animationDelay: `${idx * 100}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <div 
                    className="w-full sm:w-36 h-36 flex-shrink-0 bg-gray-200 rounded-2xl overflow-hidden cursor-pointer relative" 
                    onClick={() => navigate(`/profile/${worker.id}`, { state: { worker: worker.raw || worker } })}
                  >
                    <img src={worker.image} alt={worker.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"/>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-500" />
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex justify-between items-start">
                      <h3 
                        className="text-xl font-bold text-[#0B3B68] cursor-pointer hover:text-[#00AF91] transition-colors duration-300" 
                        onClick={() => navigate(`/profile/${worker.id}`, { state: { worker: worker.raw || worker } })}
                      >
                        {worker.name}
                      </h3>
                      <span className="text-[10px] uppercase tracking-widest font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full flex items-center gap-1.5 group-hover:bg-blue-50 group-hover:text-[#0B3B68] transition-all duration-500">
                        <MapPinIcon className="w-3 h-3" /> {worker.location}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="bg-blue-100/50 text-[#0B3B68] text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-2 group-hover:bg-[#0B3B68] group-hover:text-white transition-all duration-500">
                        {getRoleIcon(worker.role)} {worker.role}
                      </span>
                      <div className="flex items-center text-yellow-500 text-sm font-bold bg-yellow-50 px-2 py-1 rounded-lg group-hover:bg-yellow-100 transition-colors">
                        <StarIcon className="w-4 h-4 mr-1 animate-pulse" /> {worker.rating}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-6">
                      <button 
                        onClick={() => navigate(`/profile/${worker.id}`, { state: { worker: worker.raw || worker } })} 
                        className="flex-1 px-5 py-2.5 border-2 border-[#0B3B68] text-[#0B3B68] text-sm font-bold rounded-xl hover:bg-[#0B3B68] hover:text-white transition-all duration-300 active:scale-95"
                      >
                        View Profile
                      </button>
                      <button 
                        onClick={() => openRequestModal(worker.id, worker.name, worker.role, worker.raw || worker)} 
                        className="flex-1 px-5 py-2.5 bg-[#00AF91] text-white text-sm font-bold rounded-xl hover:bg-[#009b80] hover:shadow-lg hover:shadow-[#00AF91]/30 transition-all duration-300 shadow-sm active:scale-95"
                      >
                        Request Service
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200">
                <h3 className="text-2xl font-bold text-gray-400">No workers found</h3>
                <p className="text-gray-400 mt-2">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- ENHANCED REQUEST MODAL --- */}
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
              {isBookingSending ? "Sending Request..." : "Continue to Review"}
              {!isBookingSending && <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>

            <div className="flex gap-2 items-start text-[11px] text-gray-500 dark:text-slate-400 mt-4 italic">
                <LockIcon className="w-3 h-3 mt-0.5" /> Security Tip: Contact details shared only after worker accepts request.
            </div>
          </div>
        </div>
      )}

      {/* ALERT MODAL */}
      {isAlertOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-200" onClick={() => setIsAlertOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 border border-transparent dark:border-slate-800 w-full max-w-[320px] rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center animate-in zoom-in-90 duration-300">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <LockIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Wait a moment</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 leading-relaxed">{alertMessage}</p>
            <button className="w-full bg-[#0B3B68] text-white py-2.5 rounded-xl font-bold text-sm hover:bg-[#154875] transition-all active:scale-95 shadow-lg shadow-blue-900/10 cursor-pointer" onClick={() => setIsAlertOpen(false)}>Okay, I'll check</button>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      <ServiceRequestSuccessModal
        isOpen={isSuccessOpen}
        onClose={() => setIsSuccessOpen(false)}
        workerName={selectedWorkerName || "Skilled Worker"}
        workerRole={selectedWorkerRole || selectedService || "General Repair"}
        serviceLocation={submittedServiceLocation || serviceLocation || serviceCity || "Pangasinan"}
        contactNumber={submittedContactNumber || contactNumber}
        onViewRequests={() => {
          setIsSuccessOpen(false);
          navigate("/homeowner-bookings");
        }}
      />

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
        isLoading={isBookingSending}
        onConfirm={handleConfirmBookingSubmit}
        onEdit={() => setIsProofreadOpen(false)}
        onClose={() => setIsProofreadOpen(false)}
      />

     <footer className="flex-shrink-0 w-full bg-[#0B3B68] h-32 mt-auto relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
        <div className="flex flex-col items-center gap-1 relative z-10">
            <h2 className="text-white/40 font-black tracking-[0.2em] text-xs uppercase">TrabaHome</h2>
            <p className="text-white/60 text-xs">© 2026 TrabaHome. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
