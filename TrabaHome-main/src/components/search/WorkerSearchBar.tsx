import React from "react";
import { ChevronDownIcon, HammerIcon, LocateIcon, MapPinIcon } from "../../Icons";

type WorkerSearchBarProps = {
  service: string;
  location: string;
  serviceOptions: string[];
  locationOptions: string[];
  onServiceChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSearch: () => void;
  onDetectLocation?: () => void;
  isLocating?: boolean;
  className?: string;
  buttonLabel?: string;
  size?: "default" | "compact";
};

const dedupeOptions = (items: string[], selectedValue: string) => {
  const values = [selectedValue, ...items]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
};

const WorkerSearchBar: React.FC<WorkerSearchBarProps> = ({
  service,
  location,
  serviceOptions,
  locationOptions,
  onServiceChange,
  onLocationChange,
  onSearch,
  onDetectLocation,
  isLocating = false,
  className = "",
  buttonLabel = "Search",
  size = "default",
}) => {
  const resolvedServiceOptions = dedupeOptions(serviceOptions, service);
  const resolvedLocationOptions = dedupeOptions(locationOptions, location);
  const isCompact = size === "compact";

  return (
    <div className={`bg-white ${isCompact ? "p-1.5 rounded-[1.15rem]" : "p-2 rounded-2xl"} shadow-sm flex flex-col md:flex-row ${isCompact ? "gap-3" : "gap-4"} mb-8 border border-gray-100 items-center transform transition-all duration-500 hover:shadow-xl hover:-translate-y-1 ${className}`.trim()}>
      <div className={`flex-1 flex items-center ${isCompact ? "px-3.5 py-1.5" : "px-4 py-2"} border border-gray-200 ${isCompact ? "rounded-xl" : "rounded-xl"} bg-white relative w-full focus-within:border-[#00AF91] focus-within:ring-4 focus-within:ring-[#00AF91]/10 transition-all`}>
        <HammerIcon className={`${isCompact ? "w-[18px] h-[18px]" : "w-5 h-5"} text-[#0B3B68] mr-3`} />
        <select
          className={`w-full bg-transparent outline-none text-[#0B3B68] font-bold appearance-none cursor-pointer ${
            service ? "text-[#0B3B68]" : "text-gray-600"
          }`}
          value={service}
          onChange={(event) => onServiceChange(event.target.value)}
        >
          <option value="">All Services</option>
          {resolvedServiceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
      </div>

      <div className={`flex-1 flex items-center ${isCompact ? "px-3.5 py-1.5" : "px-4 py-2"} border border-gray-200 rounded-xl bg-white relative w-full focus-within:border-[#00AF91] focus-within:ring-4 focus-within:ring-[#00AF91]/10 transition-all`}>
        <MapPinIcon className={`${isCompact ? "w-[18px] h-[18px]" : "w-5 h-5"} text-[#0B3B68] mr-3`} />
        <select
          className={`w-full bg-transparent outline-none text-[#0B3B68] font-bold appearance-none cursor-pointer ${
            location ? "text-[#0B3B68]" : "text-gray-600"
          }`}
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
        >
          <option value="">All Locations</option>
          {resolvedLocationOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {onDetectLocation && (
          <button
            type="button"
            onClick={onDetectLocation}
            disabled={isLocating}
            className="ml-3 p-1.5 rounded-full text-[#0B3B68] hover:text-[#082d50] hover:bg-black/5 transition-colors disabled:opacity-50"
            aria-label="Detect location"
            title="Detect location"
          >
            <LocateIcon className={`w-4 h-4 ${isLocating ? "animate-pulse" : ""}`} />
          </button>
        )}

        <ChevronDownIcon className="w-4 h-4 text-gray-400 absolute right-4 pointer-events-none" />
      </div>

      <button
        type="button"
        onClick={onSearch}
        className={`bg-[#0B3B68] text-white w-full md:w-auto ${isCompact ? "px-7 py-2.5 min-w-[108px]" : "px-8 py-3 md:py-2 min-w-[120px]"} rounded-xl font-bold hover:bg-[#154875] transition-all shadow-md h-full active:scale-95 transform cursor-pointer`}
      >
        {buttonLabel}
      </button>
    </div>
  );
};

export default WorkerSearchBar;
