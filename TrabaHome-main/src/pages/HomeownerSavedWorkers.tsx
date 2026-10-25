// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, BookmarkX, Star } from "lucide-react";
import Navbar from "../components/requestpages/Navbar";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { readJsonCache, writeJsonCache } from "../services/pageCache.ts";
import { clearHomeownerSession } from "../utils/homeownerAuth.ts";

const SAVED_WORKERS_CACHE_KEY = "trabahome_homeowner_saved_workers";
const SAVED_WORKERS_CACHE_TTL_MS = 5 * 60 * 1000;

const normalizeLocationLabel = (item: any): string => {
  if (!item) return "Location";
  if (typeof item.location === "string" && item.location.trim()) {
    return item.location.trim();
  }
  if (typeof item.locationLabel === "string" && item.locationLabel.trim()) {
    return item.locationLabel.trim();
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
  return [item.barangay, item.city, item.area, item.province].filter(Boolean).join(", ") || "Location";
};

export default function HomeownerSavedWorkers() {
  const navigate = useNavigate();
  const cachedSavedWorkers = useMemo(
    () => readJsonCache<any[]>(SAVED_WORKERS_CACHE_KEY, SAVED_WORKERS_CACHE_TTL_MS) || [],
    []
  );
  const [savedWorkers, setSavedWorkers] = useState(cachedSavedWorkers);
  const [sortBy, setSortBy] = useState("Recently Saved");
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(cachedSavedWorkers.length === 0);

  const normalizeWorker = (item) => {
    if (!item) return null;
    const id = item.id || item.workerId || item._id;
    if (!id) return null;
    return {
      id,
      name: item.name || item.fullName || item.workerName || "Worker",
      rating: typeof item.rating === "number" ? item.rating : Number(item.rating || 0),
      service: item.service || item.serviceType || item.category || "Service",
      location: normalizeLocationLabel(item),
      photo: item.photo || item.avatar || item.image || item.profileImage || "",
      availability: item.availability || item.status || "Offline",
      savedAt: item.savedAt || item.createdAt || new Date().toISOString(),
      workedBefore: Boolean(item.workedBefore),
    };
  };

  useEffect(() => {
    let mounted = true;
    const loadSavedWorkers = async () => {
      setErrorMessage("");
      if (mounted) setIsLoading(true);
      try {
        const data = await homeownerAPI.listSavedWorkers();
        if (!mounted) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        const normalized = items.map(normalizeWorker).filter(Boolean);
        setSavedWorkers(normalized);
        writeJsonCache(SAVED_WORKERS_CACHE_KEY, normalized);
      } catch (error) {
        console.error("Failed to load saved workers:", error);
        const status = (error as any)?.response?.status;
        if (status === 401 || status === 403) {
          clearHomeownerSession();
          if (mounted) {
            navigate("/login", { replace: true });
          }
          return;
        }
        if (mounted) {
          setErrorMessage("Unable to load saved workers.");
          setSavedWorkers(cachedSavedWorkers);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadSavedWorkers();
    return () => {
      mounted = false;
    };
  }, [cachedSavedWorkers, navigate]);

  useEffect(() => {
    const handleSavedWorkersChanged = () => {
      void homeownerAPI
        .listSavedWorkers()
        .then((data) => {
          const items = Array.isArray(data?.items) ? data.items : [];
          const normalized = items.map(normalizeWorker).filter(Boolean);
          setSavedWorkers(normalized);
          writeJsonCache(SAVED_WORKERS_CACHE_KEY, normalized);
          setErrorMessage("");
        })
        .catch((error) => {
          console.error("Reload saved workers failed:", error);
        });
    };

    window.addEventListener("trabahome:saved-workers-changed", handleSavedWorkersChanged);
    window.addEventListener("storage", handleSavedWorkersChanged);

    return () => {
      window.removeEventListener("trabahome:saved-workers-changed", handleSavedWorkersChanged);
      window.removeEventListener("storage", handleSavedWorkersChanged);
    };
  }, []);

  const sortedWorkers = useMemo(() => {
    const list = [...savedWorkers];
    if (sortBy === "Highest Rating") {
      return list.sort((a, b) => b.rating - a.rating);
    }
    if (sortBy === "Available Now") {
      return list.sort((a, b) => {
        const aScore = a.availability === "Available Now" ? 1 : 0;
        const bScore = b.availability === "Available Now" ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return b.rating - a.rating;
      });
    }
    return list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }, [savedWorkers, sortBy]);

  const handleRemove = async (workerId) => {
    setSavedWorkers((prev) => {
      const updated = prev.filter((worker) => worker.id !== workerId);
      writeJsonCache(SAVED_WORKERS_CACHE_KEY, updated);
      return updated;
    });
    setToastMessage("Removed from saved workers.");
    window.setTimeout(() => setToastMessage(""), 2000);

    try {
      await homeownerAPI.removeSavedWorker(workerId);
    } catch {
      // ignore; optimistic UI
    }
  };

  const availabilityBadge = (status) => {
    if (status === "Available Now") {
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
    if (status === "Busy") {
      return "bg-amber-50 text-amber-700 border-amber-100";
    }
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0]">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors mb-6 cursor-pointer"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#0B3B68]">Saved Workers</h1>
            <p className="text-sm text-gray-500 mt-1">
              Your bookmarked professionals for future hiring.
            </p>
          </div>

          {toastMessage && (
            <div className="mb-6 px-4 py-2 rounded-full text-xs font-semibold inline-flex bg-[#E8F1F7] text-[#0B3B68] border border-[#D7E6F5]">
              {toastMessage}
            </div>
          )}
          {errorMessage && (
            <div className="mb-6 px-4 py-2 rounded-full text-xs font-semibold inline-flex bg-red-50 text-red-600 border border-red-100">
              {errorMessage}
            </div>
          )}

          {isLoading ? (
            <div className="text-sm text-gray-500 text-center py-12 border border-dashed border-gray-200 rounded-2xl">
              Loading saved workers...
            </div>
          ) : savedWorkers.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-12 border border-dashed border-gray-200 rounded-2xl">
              <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-[#EEF4FA] flex items-center justify-center">
                <Star className="h-6 w-6 text-[#0B3B68]" />
              </div>
              <p className="text-base font-semibold text-[#0B3B68]">No saved workers yet.</p>
              <p className="text-sm text-gray-500 mt-1">
                Tap ⭐ on a worker to save them for later.
              </p>
              <button
                type="button"
                onClick={() => navigate("/search")}
                className="mt-5 px-5 py-2.5 rounded-full bg-[#0B3B68] text-white text-sm font-semibold hover:bg-[#082d50] transition-colors"
              >
                Browse Services
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <p className="text-sm text-gray-500">
                  {savedWorkers.length} saved worker{savedWorkers.length !== 1 ? "s" : ""}.
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    className="px-3 py-2 rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-600"
                  >
                    <option>Highest Rating</option>
                    <option>Recently Saved</option>
                    <option>Available Now</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className="border border-gray-100 rounded-2xl overflow-hidden shadow-[0_6px_18px_rgba(11,59,104,0.06)] bg-white"
                  >
                    <div className="relative h-44 w-full overflow-hidden">
                      <img
                        src={worker.photo}
                        alt={worker.name}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove(worker.id)}
                        className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white/90 border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-500 transition-colors"
                        aria-label={`Remove ${worker.name}`}
                      >
                        <BookmarkX className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-[#0B3B68]">{worker.name}</h3>
                        <div className="flex items-center gap-1 text-sm font-semibold text-[#0B3B68]">
                          <Star className="h-4 w-4 text-yellow-400" />
                          {worker.rating.toFixed(1)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${availabilityBadge(
                            worker.availability
                          )}`}
                        >
                          {worker.availability}
                        </span>
                        {worker.workedBefore && (
                          <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border border-blue-100 bg-blue-50 text-blue-700">
                            Worked with you before
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <p className="font-semibold text-[#0B3B68]">{worker.service}</p>
                        <p>{worker.location}</p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${worker.id}`, { state: { worker } })}
                          className="flex-1 px-4 py-2 rounded-full text-sm font-semibold text-[#0B3B68] border border-[#0B3B68]/40 hover:bg-[#0B3B68] hover:text-white transition-colors"
                        >
                          View Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${worker.id}`, { state: { worker } })}
                          className="flex-1 px-4 py-2 rounded-full text-sm font-semibold text-white bg-[#0B3B68] hover:bg-[#082d50] transition-colors"
                        >
                          Hire Now
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
