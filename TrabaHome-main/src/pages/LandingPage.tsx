// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import Navbar from "../components/requestpages/Navbar";
import Footer from "../components/heropages/Footer";
import FeaturedServicesSection from "../components/heropages/FeaturedServicesSection.tsx";
import WorkerSearchBar from "../components/search/WorkerSearchBar.tsx";
import { 
  MapPinIcon, SearchIcon, HammerIcon, BrushIcon, LocateIcon,
  WrenchIcon, SproutIcon, TrowelIcon, ZapIcon, DropletIcon,
  ShieldCheckIcon, StarIcon, ArrowRightIcon, PhoneIcon
} from "../Icons";
import { Mail as MailIcon } from "lucide-react";
import { professionOptions } from "../constants/SignUpData.ts";

export default function LandingPage() {
  const navigate = useNavigate();

  const scrollContainerRef = useRef(null);
  const [service, setService] = useState("");
  const [location, setLocation] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [detectedCoords, setDetectedCoords] = useState(null);

  const availableServices = professionOptions;
  const availableLocations = ["Dagupan City", "Mangaldan", "San Fabian", "Lingayen", "Calasiao", "Binmaley"];

  const handleSearch = () => {
    const params = new URLSearchParams();
    const trimmedService = service.trim();
    const trimmedLocation = location.trim();

    if (trimmedService) params.set("service", trimmedService);
    if (trimmedLocation) {
      const normalizedLocation = trimmedLocation.toLowerCase();
      const isNearMe = ["near me", "near-me", "nearme"].includes(normalizedLocation);
      params.set("location", isNearMe ? "near-me" : trimmedLocation);
      if (isNearMe && detectedCoords) {
        params.set("lat", String(detectedCoords.lat));
        params.set("lng", String(detectedCoords.lng));
      }
    }

    const query = params.toString();
    const targetUrl = query ? `/search?${query}` : "/search";
    navigate(targetUrl);
  };

  const handleDetectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Location isn't supported on this browser.");
      return;
    }
    if (isLocating) return;

    setIsLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        setDetectedCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocation("Near me");
      },
      () => {
        setIsLocating(false);
        setLocationError("Couldn't access your location. Please type it in instead.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const navActions = (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold text-white bg-[#0B3B68] border-2 border-[#0B3B68] rounded-xl shadow-md transition-all duration-200 hover:bg-[#154875] active:scale-95 cursor-pointer whitespace-nowrap"
      >
        Hire Workers
      </button>
      <button
        type="button"
        onClick={() => navigate("/worker-login")}
        className="px-3 sm:px-6 py-1.5 sm:py-2.5 text-xs sm:text-sm font-bold text-[#0B3B68] bg-[#F9F5F0] border-2 border-[#1B75D0] rounded-xl shadow-md transition-all duration-200 hover:bg-[#1B75D0] hover:text-white active:scale-95 cursor-pointer whitespace-nowrap"
      >
        Find Jobs
      </button>
    </div>
  );

  return (
    <div
      ref={scrollContainerRef}
      className="w-full min-h-screen bg-[#FDFBF7] text-[#0B3B68] overflow-x-hidden font-sans relative"
    >
      {/* --- REAL PNG BACKGROUND LAYER --- */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <img 
          src="/assets/Group 4.png"
          className="hidden sm:block absolute top-24 left-[-50px] h-[350px] md:h-[500px] w-auto object-contain opacity-60 md:opacity-80" 
          alt="" 
        />
        <img 
          src="/assets/Group 20.png" 
          className="hidden sm:block absolute top-16 right-[-50px] h-[400px] md:h-[550px] w-auto object-contain opacity-60 md:opacity-80" 
          alt="" 
        />
        
        {/* --- GROUP 18: MOVED TO MIDDLE OF PAGE --- */}
        <img 
          src="/assets/Group 18.png" 
          className="hidden md:block absolute top-1/2 left-[-30px] transform -translate-y-1/2 h-[350px] w-auto object-contain z-0" 
          alt="" 
        />

        {/* --- ASSETS IN THE CARDS SECTION --- */}
        <div className="hidden sm:block absolute top-[1200px] w-full h-[600px]">
           <img 
             src="/assets/Ellipse 7.png" 
             className="absolute top-0 right-[-30px] h-[400px] w-auto object-contain" 
             alt="" 
           />
           <img 
             src="/assets/shopee 1.png" 
             className="absolute bottom-10 right-5 w-[180px] opacity-30" 
             alt="" 
           />
        </div>
      </div>

      <Navbar
        actions={navActions}
        logoRoute="/"
        showNotifications={false}
        showLogout={false}
      />

      {/* --- HERO SECTION --- */}
      <section className="relative z-10 px-4 sm:px-6 pt-8 sm:pt-16 pb-6 sm:pb-10 text-center flex flex-col items-center">
        <h2 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#0B3B68] tracking-tight leading-tight sm:leading-[1.1]">
          Trusted workers, right at <br className="hidden xs:inline sm:inline" /> your doorstep.
        </h2>
        <p className="mt-3 sm:mt-6 text-xs sm:text-base text-gray-500 font-medium max-w-xl px-2">
          Find trusted local plumbers, electricians, carpenters, cleaners, and verified specialists for all your home and personal care needs.
        </p>

        {/* NOTE: Main page home has NO My Bookings or Saved Workers summary cards (only available when a homeowner is logged in) */}
        
        <WorkerSearchBar
          className="mt-6 w-full max-w-5xl mb-0"
          service={service}
          location={location}
          serviceOptions={availableServices}
          locationOptions={availableLocations}
          onServiceChange={setService}
          onLocationChange={(nextValue) => {
            setLocation(nextValue);
            if (detectedCoords && nextValue.trim().toLowerCase() !== "near me") {
              setDetectedCoords(null);
            }
          }}
          onDetectLocation={handleDetectLocation}
          isLocating={isLocating}
          onSearch={handleSearch}
          size="compact"
        />
        {locationError && (
          <p className="mt-2 text-xs text-red-500 font-medium">{locationError}</p>
        )}
      </section>

      {/* --- FEATURED & OFFERED SERVICES --- */}
      <FeaturedServicesSection initialCategory="Carpenter" />

      {/* --- UPDATED GRADIENT DIVISION --- */}
      <div className="w-full h-24 sm:h-48 relative my-8 sm:my-16 overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#E1F2F7] to-transparent opacity-70"></div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent absolute top-0"></div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent absolute bottom-0"></div>
        <div className="w-[80%] h-16 sm:h-32 bg-blue-100/40 blur-[60px] sm:blur-[100px] rounded-full"></div>
      </div>

      {/* --- WHY TRABAHOME SECTION --- */}
      <section id="about" className="py-8 sm:py-16 px-4 sm:px-6 relative">
        <span id="safety-trust" className="block scroll-mt-24" />
        <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-16 relative z-10">
           <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0B3B68] mb-2 sm:mb-4">Why TrabaHome is Safe</h2>
           <p className="text-xs sm:text-base text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed">We built TrabaHome to protect both homeowners and workers—so every job feels safe, fair, and reliable.</p>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8 relative z-10">
          {[
            { icon: ShieldCheckIcon, title: "Verified Workers", desc: "Every worker is reviewed and approved before joining." },
            { icon: StarIcon, title: "Real Ratings & Reviews", desc: "See feedback from real homeowners in your area." },
            { icon: MapPinIcon, title: "Local & Nearby", desc: "Find help from people who actually work near you." },
            { icon: MailIcon, title: "Instant Email Alerts", desc: "Workers get your booking requests immediately via email." }
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl sm:rounded-[2.5rem] p-5 sm:px-8 sm:py-9 flex items-center gap-4 sm:gap-6 shadow-xs sm:shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-default group">
              <div className="bg-blue-50 p-3 sm:p-5 rounded-xl sm:rounded-2xl text-[#0B3B68] transition-colors duration-300 group-hover:bg-[#0B3B68] group-hover:text-white shrink-0">
                <item.icon className="w-6 h-6 sm:w-10 sm:h-10" />
              </div>
              <div className="text-left min-w-0">
                <h3 className="font-black text-[#0B3B68] text-base sm:text-xl truncate sm:whitespace-normal">{item.title}</h3>
                <p className="text-xs sm:text-[14px] text-gray-500 mt-1 font-medium leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="how-it-works" className="py-12 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto relative">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-[#0B3B68] text-center mb-10 sm:mb-20 relative z-10">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center gap-8 sm:gap-16 lg:gap-24 relative z-10">
          
          {/* Left Side: Featured Image with Blue Backdrop */}
          <div className="w-full md:w-1/2 relative max-w-md md:max-w-none mx-auto">
            <div className="absolute top-4 -left-2 sm:top-10 sm:-left-8 w-full h-full bg-[#0B3B68] rounded-2xl sm:rounded-[3.5rem] -z-10 shadow-lg sm:shadow-xl"></div>
            <img 
              src="https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&q=80&w=600" 
              alt="Home service professional at work" 
              className="w-full h-[260px] sm:h-[420px] md:h-[550px] object-cover rounded-2xl sm:rounded-[3.5rem] border-4 sm:border-[14px] border-white shadow-xl sm:shadow-2xl transition-transform duration-700 hover:scale-[1.02]" 
            />
          </div>
          
          {/* Right Side: Step-by-Step UI Cards */}
          <div className="w-full md:w-1/2 relative mt-4 md:mt-0">
            <div className="absolute left-[1.5rem] sm:left-[2.2rem] top-6 sm:top-10 bottom-24 sm:bottom-32 w-px border-l-2 border-dashed border-gray-300 -z-0"></div>
            
            <div className="space-y-6 sm:space-y-12">
              {[
                { step: 1, icon: SearchIcon, title: "Find a Service", desc: "Choose a service and your location", color: "#FFDBC2", text: "#E65F2A" },
                { step: 2, icon: MapPinIcon, title: "Compare Workers", desc: "Browse nearby workers with ratings", color: "#C2E0FF", text: "#0066CC" },
                { step: 3, icon: PhoneIcon, title: "Book & Review", desc: "A worker accepts your request and fixes the problem. Share feedback if you'd like.", color: "#EBC2FF", text: "#9900CC" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 sm:gap-8 group relative z-10">
                  <div className="flex-shrink-0 relative">
                    <div className="w-12 h-12 sm:w-18 sm:h-18 bg-white rounded-full flex items-center justify-center border-2 sm:border-4 border-white shadow-md sm:shadow-lg group-hover:scale-105 transition-transform duration-300">
                      <item.icon className="w-5 h-5 sm:w-8 sm:h-8" style={{ color: item.text }} />
                    </div>
                    <div className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-black text-[10px] sm:text-xs shadow-sm sm:shadow-md" style={{ backgroundColor: item.color, color: item.text }}>
                      {item.step}
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] shadow-xs sm:shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-50 flex-1 transition-all duration-300 hover:shadow-md sm:hover:shadow-xl hover:bg-[#fafafa]">
                    <h3 className="font-black text-base sm:text-xl text-[#0B3B68]">{item.title}</h3>
                    <p className="text-xs sm:text-[14px] text-gray-500 mt-0.5 sm:mt-1 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div className="mt-8 sm:mt-16 md:mt-20 ml-0 sm:ml-20 md:ml-28 flex justify-center sm:justify-start">
               <button onClick={handleSearch} className="bg-[#0B3B68] text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-bold text-sm sm:text-lg shadow-xl hover:bg-[#154575] transition-all hover:-translate-y-1 active:scale-95 cursor-pointer w-full sm:w-auto">
                 Find Workers Near Me
               </button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

