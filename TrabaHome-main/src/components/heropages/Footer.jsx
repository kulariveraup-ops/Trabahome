import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, X, MapPin, Mail } from "lucide-react";

const FacebookIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const TikTokIcon = ({ className = "h-4 w-4" }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="8" cy="18" r="4" />
    <path d="M12 18V2l7 4" />
  </svg>
);

export default function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  useEffect(() => {
    if (!isTermsOpen && !isPrivacyOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsTermsOpen(false);
        setIsPrivacyOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isTermsOpen, isPrivacyOpen]);

  return (
    <footer id="contact" className="w-full bg-[#0B3B68] text-white">
      <div className="w-full max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_1fr_1fr] gap-10">
          {/* Brand Info */}
          <div className="space-y-4">
            <img src="/assets/Logo.png" alt="TrabaHome" className="h-10 w-auto" />
            <p className="text-sm text-white/70 max-w-sm">
              Connecting trusted local professionals with homeowners across Pangasinan.
            </p>
            <div className="space-y-1 text-sm text-white/75">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-white/70" />
                <span>Pangasinan, Philippines</span>
              </p>
              <a
                href="mailto:trabahome.official@gmail.com"
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
              >
                <Mail className="h-3.5 w-3.5 text-white/80" />
                <span>trabahome.official@gmail.com</span>
              </a>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <a
                href="#"
                aria-label="Facebook"
                className="h-9 w-9 rounded-full border border-white/30 flex items-center justify-center text-white/80 hover:text-white hover:border-white transition-colors"
              >
                <FacebookIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="h-9 w-9 rounded-full border border-white/30 flex items-center justify-center text-white/80 hover:text-white hover:border-white transition-colors"
              >
                <InstagramIcon className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="TikTok"
                className="h-9 w-9 rounded-full border border-white/30 flex items-center justify-center text-white/80 hover:text-white hover:border-white transition-colors"
              >
                <TikTokIcon className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Homeowners */}
          <div className="grid grid-cols-1 gap-6 md:pt-4">
            <div>
              <h4 className="text-sm font-bold tracking-wide mb-4">Homeowners</h4>
              <ul className="space-y-2 text-sm text-white/80">
                <li>
                  <Link to="/search" onClick={scrollToTop} className="hover:text-white transition-colors">
                    Hire Workers
                  </Link>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#safety-trust" className="hover:text-white transition-colors">
                    Safety &amp; Trust
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-white transition-colors">
                    Browse Services
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Workers */}
          <div className="md:pt-4">
            <h4 className="text-sm font-bold tracking-wide mb-4">Workers</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link to="/worker-login" onClick={scrollToTop} className="hover:text-white transition-colors">
                  Find Jobs
                </Link>
              </li>
              <li>
                <Link to="/worker-signup" onClick={scrollToTop} className="hover:text-white transition-colors">
                  Create Worker Account
                </Link>
              </li>
              <li>
                <a href="#verification" className="hover:text-white transition-colors">
                  Verification Process
                </a>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:pt-4">
            <h4 className="text-sm font-bold tracking-wide mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(true)}
                  className="hover:text-white transition-colors text-left cursor-pointer"
                >
                  Terms &amp; Conditions
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-white/10 mt-6">
        <div className="max-w-6xl mx-auto px-6 py-4 text-center text-xs text-white/70">
          &copy; 2026 TrabaHome. All rights reserved.
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      {isTermsOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Terms &amp; Conditions"
          onClick={() => setIsTermsOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-white/85 text-[#0B3B68] rounded-[28px] shadow-[0_20px_60px_rgba(11,59,104,0.18)] border border-white/60 backdrop-blur-[16px] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 px-6 pt-5 pb-4 border-b border-white/60 bg-white/80 backdrop-blur-[16px] relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#E8F1FB] text-[#1B75D0] flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[26px] font-semibold tracking-[0.2px] text-[#0B3B68]">
                      TrabaHome Terms &amp; Conditions
                    </h3>
                    <p className="text-[13px] text-[#6B7280] mt-1">Last Updated: January 2026</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTermsOpen(false)}
                  aria-label="Close"
                  className="h-9 w-9 rounded-full border border-[#D7E3F4] bg-white/80 text-[#0B3B68] hover:bg-[#E8F1FB] transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-[#1B75D0]/50 via-[#1B75D0]/20 to-transparent" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-[14.5px] text-[#4B5563] leading-relaxed space-y-5 legal-scrollbar">
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">1. What TrabaHome Is</h4>
                <p className="mt-2">
                  TrabaHome is a web platform that connects homeowners with independent workers for home services. TrabaHome does not directly provide services and is not an employer of workers.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">2. Accounts and Responsibilities</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>You are responsible for maintaining your account credentials.</li>
                  <li>You are responsible for all activity performed using your account.</li>
                  <li>Do not create accounts using false information or impersonate others.</li>
                </ul>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">3. Platform Rules (What’s Not Allowed)</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Submitting spam or fake service requests.</li>
                  <li>Posting duplicate requests to overload workers or the system.</li>
                  <li>Providing misleading request details (wrong service type/location, unclear scope).</li>
                  <li>Harassment, threats, or abuse toward others.</li>
                  <li>Requests involving illegal or prohibited activities.</li>
                </ul>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">4. Service Request Flow</h4>
                <p className="mt-2">TrabaHome supports request tracking through the following flow:</p>
                <p className="mt-2 text-[13px] font-semibold text-[#6B7280]">
                  Pending → Accepted → Contact information revealed → Completed (marked by homeowner) → Rating (optional)
                </p>
                <p className="mt-2 text-[13px] text-[#6B7280]">
                  Availability and outcomes depend on user actions and worker availability.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">5. Independent Workers</h4>
                <p className="mt-2">
                  Workers on TrabaHome are independent service providers. Any agreements about scope of work, scheduling, and service completion happen between the homeowner and worker.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">6. Ratings and Feedback</h4>
                <p className="mt-2">
                  Homeowners may rate workers after a request is completed. Feedback must be honest and respectful.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">7. Suspension and Account Restrictions</h4>
                <p className="mt-2">
                  To protect users and platform integrity, TrabaHome may suspend accounts that violate policies or misuse the platform.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">8. Web App Access and Compatibility</h4>
                <p className="mt-2">
                  TrabaHome is a web application. You are responsible for your device, browser, and internet connection. Some features may perform differently based on device or network.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">9. Availability and Changes</h4>
                <p className="mt-2">
                  TrabaHome may update features or discontinue parts of the platform at any time. We do our best to keep the platform stable, but cannot guarantee uninterrupted access.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">10. Disclaimer</h4>
                <p className="mt-2">
                  TrabaHome is provided “as is.” We do not guarantee worker availability, service quality, or that a request will be accepted or completed.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">11. Limitation of Liability</h4>
                <p className="mt-2">
                  To the extent allowed by law, TrabaHome is not liable for damages caused by services performed by workers or by interactions between users.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">12. Contact</h4>
                <p className="mt-2">Questions about these terms? Contact: trabahome.official@gmail.com</p>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {isPrivacyOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label="Privacy Policy"
          onClick={() => setIsPrivacyOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-white/85 text-[#0B3B68] rounded-[28px] shadow-[0_20px_60px_rgba(11,59,104,0.18)] border border-white/60 backdrop-blur-[16px] overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 px-6 pt-5 pb-4 border-b border-white/60 bg-white/80 backdrop-blur-[16px] relative">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-full bg-[#E8F1FB] text-[#1B75D0] flex items-center justify-center">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[26px] font-semibold tracking-[0.2px] text-[#0B3B68]">
                      TrabaHome Privacy Policy
                    </h3>
                    <p className="text-[13px] text-[#6B7280] mt-1">Last Updated: January 2026</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(false)}
                  aria-label="Close"
                  className="h-9 w-9 rounded-full border border-[#D7E3F4] bg-white/80 text-[#0B3B68] hover:bg-[#E8F1FB] transition-colors flex items-center justify-center cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 h-0.5 w-full bg-gradient-to-r from-[#1B75D0]/50 via-[#1B75D0]/20 to-transparent" />
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 text-[14.5px] text-[#4B5563] leading-relaxed space-y-5 legal-scrollbar">
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">1. Information We Collect</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Account information (name, email, phone number).</li>
                  <li>Profile details (general location, services offered).</li>
                  <li>Service request data (service category, details, dates).</li>
                  <li>Ratings and feedback provided to other users.</li>
                  <li>Web app usage data (browser, device, pages/actions) for security and troubleshooting.</li>
                </ul>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">2. How We Use Your Information</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Create and manage your account.</li>
                  <li>Process service requests and display request status.</li>
                  <li>Match homeowners and workers based on service type and location.</li>
                  <li>Maintain platform security and prevent abuse/spam.</li>
                  <li>Support and monitor for safety (e.g., request history and suspension logs).</li>
                </ul>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">3. When Contact Information Is Shared</h4>
                <p className="mt-2">
                  To support coordination, contact information may be revealed only after a worker accepts a request, following the system flow.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">4. Cookies and Similar Technologies</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Keep you signed in.</li>
                  <li>Remember preferences.</li>
                  <li>Protect the platform from misuse.</li>
                </ul>
                <p className="mt-2 text-[13px] text-[#6B7280]">
                  You can control cookies through your browser settings, but some features may not work properly.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">5. Sharing of Information</h4>
                <p className="mt-2">
                  We do not sell personal data. We may share limited information only when necessary:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>With trusted service providers (e.g., email notification services) to send alerts.</li>
                  <li>For platform security, fraud prevention, or admin review.</li>
                  <li>If required by law.</li>
                </ul>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">6. Data Retention</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Account operations and request tracking.</li>
                  <li>Safety, auditing, and preventing abuse.</li>
                  <li>You may request account deletion, subject to reasonable retention for platform integrity.</li>
                </ul>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">7. Security</h4>
                <p className="mt-2">
                  We take reasonable steps to protect your information. However, no system is fully secure, and we cannot guarantee complete protection of data.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">8. Your Choices</h4>
                <ul className="mt-2 list-disc pl-5 space-y-1">
                  <li>Access or update your account information.</li>
                  <li>Correct inaccurate details.</li>
                  <li>Request deletion of your account (when applicable).</li>
                </ul>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">9. Changes to This Policy</h4>
                <p className="mt-2">
                  We may update this Privacy Policy from time to time. Updates will be posted here with a new effective date.
                </p>
              </section>
              <section className="bg-[#f9fafb] rounded-xl p-4">
                <h4 className="text-[17px] font-bold text-[#0B3B68] tracking-[0.2px]">10. Contact</h4>
                <p className="mt-2">Privacy questions? Contact: trabahome.official@gmail.com</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </footer>
  );
}
