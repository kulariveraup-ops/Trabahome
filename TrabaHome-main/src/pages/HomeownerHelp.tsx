import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, CheckCircle, Loader2, X } from "lucide-react";
import Navbar from "../components/requestpages/Navbar";
import SupportConversation from "../components/support/SupportConversation.tsx";
import { getHomeownerAuthToken, getHomeownerSession } from "../utils/homeownerAuth.ts";
import { homeownerAPI } from "../services/HomeownerApi.ts";
import { SUPPORT_ISSUE_CATEGORIES, submitSupportTicket } from "../services/SupportApi.ts";
import WelcomeOnboardingModal from "../components/onboarding/WelcomeOnboardingModal.tsx";

const isValidEmailFormat = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const FAQ_SECTIONS = [
  {
    title: "Booking Issues",
    items: [
      "Worker didn’t show up",
      "How to cancel a booking",
      "How to reschedule a job",
    ],
  },
  {
    title: "Safety & Reporting",
    items: [
      "Report a worker",
      "Report inappropriate behavior",
      "How worker verification works",
    ],
  },
  {
    title: "Account Help",
    items: [
      "Change password",
      "Update phone number",
      "Delete account",
    ],
  },
];

export default function HomeownerHelp() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getHomeownerSession();
  const homeowner = session?.homeowner || {};
  const resolvedFirstName = homeowner.firstName || homeowner.firstname || homeowner.givenName || "";
  const resolvedLastName = homeowner.lastName || homeowner.lastname || homeowner.surname || "";
  const initialName = [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ").trim() || homeowner.name || "Homeowner";
  const initialEmail = session?.email || homeowner.email || "";

  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supportRefreshKey, setSupportRefreshKey] = useState(0);
  const [newTicketId, setNewTicketId] = useState("");
  const [formValues, setFormValues] = useState({
    category: "Booking Issue",
    customCategory: "",
    message: "",
  });

  useEffect(() => {
    const token = session?.token || getHomeownerAuthToken();
    if (!token) return;
    if (session?.homeowner?.firstName && session?.email) return;

    homeownerAPI
      .me()
      .then((data) => {
        const h = data?.homeowner;
        if (h) {
          const first = h.firstName || h.firstname || h.givenName || "";
          const last = h.lastName || h.lastname || h.surname || "";
          const fullName = [first, last].filter(Boolean).join(" ").trim() || h.name || "";
          const userEmail = h.email || "";
          setName((prev) => (!prev || prev === "Homeowner" ? fullName || "Homeowner" : prev));
          setEmail((prev) => (!prev ? userEmail : prev));
        }
      })
      .catch(() => {});
  }, [session?.token]);

  const wordCount = useMemo(() => {
    const words = formValues.message.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [formValues.message]);

  const isOtherCategory = formValues.category === "Other";
  const resolvedCategory = isOtherCategory
    ? formValues.customCategory.trim()
    : formValues.category.trim();

  const isFormValid = Boolean(
    name.trim() &&
    email.trim() &&
    isValidEmailFormat(email) &&
    resolvedCategory &&
    formValues.message.trim() &&
    wordCount <= 250 &&
    (!isOtherCategory || formValues.customCategory.trim()) &&
    !isSubmitting
  );

  const notificationTicketId = String(new URLSearchParams(location.search).get("ticketId") || "").trim();
  const openTicketId = notificationTicketId || newTicketId;

  useEffect(() => {
    if (!notificationTicketId) return;
    document.getElementById("my-support-requests")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [notificationTicketId]);

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return FAQ_SECTIONS;
    return FAQ_SECTIONS.map((section) => {
      const matchedItems = section.items.filter((item) =>
        item.toLowerCase().includes(term)
      );
      const matchesTitle = section.title.toLowerCase().includes(term);
      return matchesTitle
        ? section
        : { ...section, items: matchedItems };
    }).filter((section) => section.items.length > 0);
  }, [query]);

  const handleOpenSummaryModal = (event) => {
    event.preventDefault();
    setFormError("");
    setFormStatus("");
    const token = session?.token || getHomeownerAuthToken();
    if (!token) {
      setFormError("You're not signed in. Please log in to submit a request.");
      return;
    }
    if (!name.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!email.trim() || !isValidEmailFormat(email)) {
      setFormError("Please enter a valid email address.");
      return;
    }
    if (!resolvedCategory) {
      setFormError("Please select an issue category.");
      return;
    }
    if (!formValues.message.trim()) {
      setFormError("Please enter a message describing your concern.");
      return;
    }
    if (wordCount > 250) {
      setFormError("Message must be 250 words or fewer.");
      return;
    }
    setIsSummaryModalOpen(true);
  };

  const handleConfirmSubmit = async () => {
    if (isSubmitting) return;
    const activeToken = session?.token || getHomeownerAuthToken();
    if (!activeToken) {
      setFormError("You're not signed in. Please log in to submit a request.");
      setIsSummaryModalOpen(false);
      return;
    }

    setFormStatus("");
    setFormError("");
    setIsSubmitting(true);

    const payload = {
      name: name.trim(),
      email: email.trim(),
      issueCategory: resolvedCategory,
      message: formValues.message.trim(),
    };

    try {
      const data = await submitSupportTicket(activeToken, payload);
      const ticketNumber = data?.ticketNumber;
      setIsSummaryModalOpen(false);
      setFormStatus("Your ticket is now submitted! Please wait within 24 hours for the reply.");
      setNewTicketId(ticketNumber || "");
      setSupportRefreshKey((current) => current + 1);
      setFormValues((prev) => ({
        ...prev,
        message: "",
        customCategory: "",
      }));
    } catch (error) {
      setFormError(error?.message || "Unable to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F5F0]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-10 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
            className="inline-flex items-center justify-center h-9 w-9 rounded-full text-gray-600 hover:text-[#0B3B68] hover:bg-gray-100 transition-colors mb-6 cursor-pointer dark:text-slate-400 dark:hover:text-blue-300 dark:hover:bg-slate-800"
            aria-label="Go back"
          >
            <ChevronLeft size={18} />
          </button>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#0B3B68] dark:text-blue-300">How can we help you?</h1>
            <p className="text-sm text-gray-500 mt-2 dark:text-slate-400">
              Browse topics below or search for a specific issue.
            </p>
          </div>

          {/* Interactive Guide Banner */}
          <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/40 to-white dark:from-slate-800 dark:to-slate-850 border border-blue-100 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#004A8C] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                TH
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-[#0B3B68] dark:text-blue-300">
                  New to TrabaHome? Review Key Features
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                  Learn how to find workers, request bookings, chat, and download official E-receipts in 4 simple steps.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsGuideOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#004A8C] hover:bg-[#003666] text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer self-start sm:self-center"
            >
              Open Interactive Guide
            </button>
          </div>

          <div className="mb-10">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search for help topics..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-400"
            />
          </div>

          {filteredSections.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl dark:border-slate-700 dark:text-slate-400">
              No matching help topics found.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSections.map((section) => (
              <div
                key={section.title}
                className="border border-gray-100 rounded-2xl p-5 bg-[#F9FAFB] space-y-3 dark:border-slate-800 dark:bg-slate-800/80"
              >
                <h2 className="text-sm font-bold text-[#0B3B68] dark:text-blue-300">{section.title}</h2>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-slate-300">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#0B3B68]/50 dark:bg-blue-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div id="contact-support" className="mt-12 border-t border-gray-100 pt-10 dark:border-slate-800">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-[#0B3B68] dark:text-blue-300">Still need help?</h2>
              <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">Contact Support Form</p>
            </div>
            <div className="space-y-6">
              <div className="text-sm text-gray-600 dark:text-slate-300">
                <p className="text-gray-500 dark:text-slate-400">We reply within 24 hours.</p>
                <p className="mt-2">
                  Email:{" "}
                  <a
                    href="mailto:trabahome.official@gmail.com"
                    className="text-[#0B3B68] font-semibold hover:underline dark:text-blue-400"
                  >
                    trabahome.official@gmail.com
                  </a>
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleOpenSummaryModal}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-2">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@email.com"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-2">Issue Category</label>
                  <select
                    value={formValues.category}
                    onChange={(event) =>
                      setFormValues((prev) => ({ ...prev, category: event.target.value }))
                    }
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {SUPPORT_ISSUE_CATEGORIES.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {isOtherCategory && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-2">Specify Issue</label>
                    <input
                      type="text"
                      value={formValues.customCategory}
                      onChange={(event) =>
                        setFormValues((prev) => ({ ...prev, customCategory: event.target.value }))
                      }
                      placeholder="Type your issue"
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-300 mb-2">Message</label>
                  <textarea
                    value={formValues.message}
                    onChange={(event) =>
                      setFormValues((prev) => {
                        const words = event.target.value.trim().split(/\s+/).filter(Boolean);
                        if (words.length <= 250) {
                          return { ...prev, message: event.target.value };
                        }
                        const capped = words.slice(0, 250).join(" ");
                        return { ...prev, message: capped };
                      })
                    }
                    rows={4}
                    placeholder="Tell us what happened..."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0B3B68]/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {wordCount}/250 words
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!isFormValid || isSubmitting}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors cursor-pointer ${
                    isFormValid && !isSubmitting
                      ? "bg-[#0B3B68] text-white hover:bg-[#082d50]"
                      : "bg-[#0B3B68]/60 text-white cursor-not-allowed"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Ticket"}
                </button>

                {formError && <p className="text-xs text-red-500 font-semibold">{formError}</p>}
                {formStatus && (
                  <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">{formStatus}</p>
                      {newTicketId && (
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                          Ticket #{newTicketId}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </form>

              {/* Proofread Summary Modal */}
              {isSummaryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                  <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 relative">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800">
                      <div>
                        <h3 className="text-xl font-bold text-[#0B3B68] dark:text-blue-300">Ticket Summary</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                          Please proofread your ticket before submitting.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => !isSubmitting && setIsSummaryModalOpen(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 p-1 rounded-full transition-colors cursor-pointer"
                        aria-label="Close"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="py-4 space-y-3">
                      <div className="bg-gray-50 dark:bg-slate-800/60 rounded-2xl p-4 space-y-2.5 text-sm">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs pb-2 border-b border-gray-200/60 dark:border-slate-700/60 gap-1">
                          <span className="font-medium text-gray-500 dark:text-slate-400">Name:</span>
                          <span className="font-semibold text-gray-800 dark:text-slate-200">{name}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs pb-2 border-b border-gray-200/60 dark:border-slate-700/60 gap-1">
                          <span className="font-medium text-gray-500 dark:text-slate-400">Email:</span>
                          <span className="font-semibold text-gray-800 dark:text-slate-200">{email}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs pb-2 border-b border-gray-200/60 dark:border-slate-700/60 gap-1">
                          <span className="font-medium text-gray-500 dark:text-slate-400">Issue Category:</span>
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#0B3B68]/10 text-[#0B3B68] dark:bg-blue-900/40 dark:text-blue-300">
                            {resolvedCategory}
                          </span>
                        </div>
                        <div className="pt-1">
                          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-slate-400 mb-1.5">
                            <span className="font-medium">Message:</span>
                            <span className="text-[10px]">{wordCount}/250 words</span>
                          </div>
                          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200/80 dark:border-slate-700 text-xs text-gray-700 dark:text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {formValues.message}
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-500 dark:text-slate-400 italic text-center">
                        Our team will review your ticket and reply within 24 hours.
                      </p>
                    </div>

                    {formError && (
                      <p className="text-xs text-red-500 font-semibold mb-3">{formError}</p>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setIsSummaryModalOpen(false)}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        Back to Edit
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleConfirmSubmit}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-[#0B3B68] text-white hover:bg-[#082d50] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        <span>{isSubmitting ? "Submitting..." : "Confirm & Submit"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div id="my-support-requests" className="scroll-mt-28 pt-2">
                <SupportConversation
                  token={session?.token || ""}
                  currentRole="Homeowner"
                  initialTicketId={openTicketId}
                  refreshKey={supportRefreshKey}
                  detailRefreshKey={location.key}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Guide Walkthrough Modal */}
      <WelcomeOnboardingModal
        isOpen={isGuideOpen}
        role="homeowner"
        userName={name}
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
