import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ArrowRightIcon } from "../../Icons";
import {
  OFFERED_SERVICES,
  getCategoryContent,
  type OfferedServiceItem,
} from "../../constants/featuredServicesData";

interface FeaturedServicesSectionProps {
  initialCategory?: string;
  className?: string;
}

export const FeaturedServicesSection: React.FC<FeaturedServicesSectionProps> = ({
  initialCategory = "Carpenter",
  className = "",
}) => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [autoRotateEnabled, setAutoRotateEnabled] = useState<boolean>(true);
  const [isSectionVisible, setIsSectionVisible] = useState<boolean>(false);

  const visibleCategories = OFFERED_SERVICES;

  // Current active service item details
  const activeContent: OfferedServiceItem = useMemo(() => {
    return getCategoryContent(activeCategory);
  }, [activeCategory]);

  // Clean up resume timeout on unmount
  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  // Visibility observer for auto-rotation
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const target = sectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSectionVisible(entry.isIntersecting);
      },
      { threshold: 0.25 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  // Auto-rotate through visible categories every 3.5 seconds
  useEffect(() => {
    if (!autoRotateEnabled || !isSectionVisible || visibleCategories.length <= 1) return;

    const intervalId = setInterval(() => {
      setActiveCategory((current) => {
        const currentIndex = visibleCategories.findIndex(
          (item) => item.name.toLowerCase() === current.toLowerCase()
        );
        const nextIndex =
          currentIndex === -1 ? 0 : (currentIndex + 1) % visibleCategories.length;
        return visibleCategories[nextIndex].name;
      });
    }, 3500);

    return () => clearInterval(intervalId);
  }, [autoRotateEnabled, isSectionVisible, visibleCategories]);

  // Smoothly scroll active tab into view in the horizontal container
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  }, [activeCategory]);

  const handleCategorySelect = (categoryName: string) => {
    setActiveCategory(categoryName);
    setAutoRotateEnabled(false);

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    // Stop for 30 seconds upon user selection, then continue scrolling
    resumeTimeoutRef.current = setTimeout(() => {
      setAutoRotateEnabled(true);
    }, 30000);
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollOffset = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({
        left: scrollOffset,
        behavior: "smooth",
      });
    }
    setAutoRotateEnabled(false);

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = setTimeout(() => {
      setAutoRotateEnabled(true);
    }, 30000);
  };

  const handleFindService = (categoryName: string) => {
    navigate(`/search?service=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section
      id="services"
      ref={sectionRef}
      className={`px-3 sm:px-6 py-4 sm:py-6 max-w-5xl mx-auto relative z-10 scroll-mt-24 ${className}`}
    >
      {/* --- HORIZONTAL CATEGORY TABS WITH SCROLL CONTROLS --- */}
      <div className="relative mb-4 sm:mb-6">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          aria-label="Scroll services left"
          className="hidden md:flex absolute -left-4 top-[44px] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-[#0B3B68] hover:bg-blue-50 hover:scale-105 transition-all cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex items-center overflow-x-auto pt-3 pb-3.5 sm:pt-4 sm:pb-4 gap-2.5 sm:gap-3.5 px-3 sm:px-4 scroll-smooth [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-200/60 hover:[&::-webkit-scrollbar-thumb]:bg-blue-300"
        >
          {visibleCategories.map((cat) => {
            const isActive = activeCategory.toLowerCase() === cat.name.toLowerCase();
            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => handleCategorySelect(cat.name)}
                className="flex flex-col items-center gap-1.5 sm:gap-2 min-w-[80px] sm:min-w-[96px] max-w-[108px] sm:max-w-[120px] transition-colors relative pb-2.5 sm:pb-3 cursor-pointer group shrink-0 focus:outline-none"
              >
                <div
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-200 flex items-center justify-center shrink-0 ${
                    isActive
                      ? "bg-blue-100 text-[#0B3B68] shadow-xs ring-2 ring-[#0B3B68]/25"
                      : "text-gray-500 group-hover:text-[#0B3B68] bg-white group-hover:bg-blue-50/60 border border-gray-200/80 group-hover:border-blue-200 shadow-2xs"
                  }`}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight line-clamp-2 px-1 transition-colors ${
                    isActive ? "text-[#0B3B68]" : "text-gray-500 group-hover:text-gray-800"
                  }`}
                >
                  {cat.shortName}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 w-8 sm:w-10 h-[3px] bg-[#0B3B68] rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll("right")}
          aria-label="Scroll services right"
          className="hidden md:flex absolute -right-4 top-[44px] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-white shadow-md border border-gray-200 items-center justify-center text-[#0B3B68] hover:bg-blue-50 hover:scale-105 transition-all cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* --- CATEGORY DETAILS CARD --- */}
      <div key={activeContent.name} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-3 sm:mb-5 ml-1 sm:ml-2 flex items-center justify-between flex-wrap gap-2">
          <span className="inline-block px-3.5 sm:px-5 py-1 sm:py-1.5 rounded-full border border-gray-300 text-xs sm:text-[13px] font-semibold text-[#4B5563] bg-white/90 shadow-2xs">
            {activeContent.label}
          </span>
          <span className="text-[11px] font-bold text-[#0066CC] bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-100">
            {activeContent.group}
          </span>
        </div>

        <div className="bg-[#BCCDD9] rounded-2xl sm:rounded-[2.5rem] p-3 sm:p-6 md:p-10 relative overflow-hidden min-h-[370px] sm:min-h-[420px] flex items-center shadow-inner group transition-all duration-700 hover:shadow-2xl">
          <div className="absolute inset-0 w-full h-full">
            <img
              src={activeContent.image}
              alt={activeContent.title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              loading="lazy"
            />
          </div>

          <div className="relative z-10 bg-white/95 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl max-w-sm sm:max-w-md w-full mx-auto md:mx-0 md:ml-8 border border-white/60 transform transition-all duration-500 hover:-translate-y-1 hover:bg-white">
            <div className="flex items-center gap-2.5 mb-2 sm:mb-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-[#0B3B68] flex items-center justify-center shrink-0">
                <activeContent.icon className="w-5 h-5 shrink-0" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-[#0B3B68]">
                {activeContent.title}
              </h3>
            </div>

            <p className="text-xs sm:text-[14px] text-gray-600 mb-4 sm:mb-6 leading-relaxed font-medium">
              {activeContent.description}
            </p>

            <ul className="text-xs sm:text-[14px] text-gray-700 mb-5 sm:mb-8 space-y-2 sm:space-y-3">
              {activeContent.points.map((point, index) => (
                <li key={index} className="flex items-start gap-2.5 sm:gap-3">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0 mt-1.5" />
                  <span className="leading-snug">{point}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleFindService(activeContent.name)}
                className="inline-flex items-center text-xs sm:text-sm font-bold text-[#0B3B68] hover:text-[#0066CC] hover:gap-3 transition-all cursor-pointer border-b-2 border-[#0B3B68] pb-1"
              >
                Find {activeContent.shortName}s Near Me{" "}
                <ArrowRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- BUTTON: VIEW ALL SERVICES --- */}
      <div className="mt-8 text-center">
        <button
          type="button"
          onClick={() => navigate("/services")}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B3B68] hover:bg-[#082d50] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer active:scale-95 group"
        >
          <span>View All Services</span>
          <ArrowRightIcon className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </section>
  );
};

export default FeaturedServicesSection;
