// @ts-nocheck
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Search, ArrowRight, CheckCircle2 } from "lucide-react";
import Navbar from "../components/requestpages/Navbar";
import Footer from "../components/heropages/Footer";
import { getHomeownerSession } from "../utils/homeownerAuth.ts";
import {
  OFFERED_SERVICES,
  SERVICE_GROUPS,
  type ServiceGroup,
  type OfferedServiceItem,
} from "../constants/featuredServicesData";

export default function ServicesPage() {
  const navigate = useNavigate();
  const homeownerSession = getHomeownerSession();
  const hasHomeownerSession = Boolean(homeownerSession?.token);

  const [selectedGroup, setSelectedGroup] = useState<ServiceGroup>("All Services");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredServices = useMemo(() => {
    let list = OFFERED_SERVICES;

    if (selectedGroup !== "All Services") {
      list = list.filter((item) => item.group === selectedGroup);
    }

    const trimmed = searchTerm.trim().toLowerCase();
    if (trimmed) {
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(trimmed) ||
          item.title.toLowerCase().includes(trimmed) ||
          item.description.toLowerCase().includes(trimmed) ||
          item.points.some((p) => p.toLowerCase().includes(trimmed)) ||
          item.label.toLowerCase().includes(trimmed)
      );
    }

    return list;
  }, [selectedGroup, searchTerm]);

  const handleBackToHome = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(hasHomeownerSession ? "/home" : "/");
    }
  };

  const handleSearchService = (serviceName: string) => {
    navigate(`/search?service=${encodeURIComponent(serviceName)}`);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#0B3B68] font-sans flex flex-col justify-between selection:bg-[#0B3B68] selection:text-white">
      <div>
        {/* Upper Taskbar */}
        <Navbar logoRoute={hasHomeownerSession ? "/home" : "/"} />

        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          {/* Back Button to Homepage */}
          <div className="mb-6 sm:mb-8">
            <button
              type="button"
              onClick={handleBackToHome}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#0B3B68] bg-white border border-gray-200 hover:bg-blue-50/70 hover:border-blue-300 shadow-2xs transition-all cursor-pointer group"
            >
              <ChevronLeft className="w-4 h-4 text-[#0B3B68] transition-transform group-hover:-translate-x-1" />
              <span>Back to Homepage</span>
            </button>
          </div>

          {/* Header Title Section */}
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 mb-3 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#0066CC] animate-pulse" />
              <span className="text-[11px] sm:text-xs font-bold tracking-wider uppercase text-[#0066CC]">
                Offered Services
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0B3B68] tracking-tight leading-tight">
              Featured Services &amp; Skilled Trades
            </h1>

            <p className="mt-3 text-xs sm:text-sm md:text-base text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">
              TrabaHome connects you to more than just carpentry and repair. Explore our full range of
              verified plumbers, cooks, stylists, babysitters, cleaners, welders, and local specialists across Pangasinan.
            </p>

            {/* In-Page Search Bar */}
            <div className="mt-6 max-w-md mx-auto relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search services (e.g., cooking, electrical, cleaning)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-gray-200 bg-white text-xs sm:text-sm font-medium text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/20 focus:border-[#0B3B68] shadow-2xs transition-all"
              />
            </div>

            {/* Filter Section (Category Groups) */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-5 sm:mt-6">
              {SERVICE_GROUPS.map((group) => {
                const isGroupActive = selectedGroup === group;
                const count =
                  group === "All Services"
                    ? OFFERED_SERVICES.length
                    : OFFERED_SERVICES.filter((s) => s.group === group).length;

                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => setSelectedGroup(group)}
                    className={`text-xs sm:text-sm font-bold px-4 py-2 rounded-full transition-all duration-200 cursor-pointer ${
                      isGroupActive
                        ? "bg-[#0B3B68] text-white shadow-xs scale-105"
                        : "bg-white text-gray-600 hover:text-[#0B3B68] border border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {group} <span className="opacity-70 text-[11px] ml-1">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Services Cards Grid */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8 shadow-xs">
              <p className="text-base font-bold text-gray-700">No services match your search.</p>
              <p className="text-xs text-gray-500 mt-1">Try searching for a different keyword or resetting filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedGroup("All Services");
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0B3B68] text-white text-xs font-bold hover:bg-[#082d50] cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {filteredServices.map((serviceItem: OfferedServiceItem) => {
                const IconComponent = serviceItem.icon;

                return (
                  <div
                    key={serviceItem.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden group"
                  >
                    <div>
                      {/* Image Header with Badge */}
                      <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-gray-100">
                        <img
                          src={serviceItem.image}
                          alt={serviceItem.title}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                        
                        {/* Group Pill Tag */}
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-xs text-[#0B3B68] shadow-2xs">
                            {serviceItem.group}
                          </span>
                        </div>

                        {/* Title overlay */}
                        <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2.5 text-white">
                          <div className="p-2 rounded-xl bg-white/20 backdrop-blur-md shrink-0">
                            <IconComponent className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-extrabold text-lg truncate drop-shadow-sm">
                              {serviceItem.name}
                            </h3>
                          </div>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 sm:p-6">
                        <div className="mb-3">
                          <span className="inline-block text-[11px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100">
                            {serviceItem.label}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 leading-relaxed mb-4">
                          {serviceItem.description}
                        </p>

                        {/* 3 Key Points */}
                        <ul className="space-y-2 border-t border-gray-100 pt-3 mb-4">
                          {serviceItem.points.map((point, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-xs text-gray-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                              <span className="leading-snug">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="p-5 sm:p-6 pt-0">
                      <button
                        type="button"
                        onClick={() => handleSearchService(serviceItem.name)}
                        className="w-full py-2.5 px-4 rounded-xl bg-blue-50 hover:bg-[#0B3B68] text-[#0B3B68] hover:text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer shadow-2xs group/btn"
                      >
                        <span>Find {serviceItem.shortName}s</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
