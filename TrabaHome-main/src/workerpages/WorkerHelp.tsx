import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, Loader2, Send, X } from "lucide-react";
import { Header, Sidebar } from "../components/workersjobs/Index.ts";
import SupportConversation from "../components/support/SupportConversation.tsx";
import { clearWorkerSession, getWorkerAuthToken, getWorkerSession, updateWorkerSession } from "../utils/workerAuth.ts";
import { workerAPI } from "../services/WorkerApi.ts";
import { SUPPORT_ISSUE_CATEGORIES, submitSupportTicket } from "../services/SupportApi.ts";
import WelcomeOnboardingModal from "../components/onboarding/WelcomeOnboardingModal.tsx";

const isValidEmailFormat = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());

const WORKER_FAQ_SECTIONS = [
  {
    title: "Jobs & Bookings",
    items: [
      "How to accept or decline service requests",
      "How to coordinate and chat with homeowners",
      "What to do if a homeowner cancels or is unavailable",
    ],
  },
  {
    title: "Completion & Reviews",
    items: [
      "How to mark a booking as completed",
      "Understanding homeowner reviews and ratings",
      "Resolving service disputes or misunderstandings",
    ],
  },
  {
    title: "Account & Verification",
    items: [
      "How to update your profile, skills, and portfolio",
      "Worker ID verification process and status",
      "Setting availability (Online, Offline, Day Off)",
    ],
  },
];

export default function WorkerHelp() {
  const navigate = useNavigate();
  const location = useLocation();
  const session = getWorkerSession();
  const workerSession = session;
  const initialWorker = session?.worker || {};

  const resolvedFirstName = initialWorker.firstName || initialWorker.firstname || "";
  const resolvedLastName = initialWorker.lastName || initialWorker.lastname || "";
  const initialWorkerName =
    [resolvedFirstName, resolvedLastName].filter(Boolean).join(" ").trim() ||
    initialWorker.name ||
    initialWorker.fullName ||
    "";
  const initialWorkerEmail = session?.email || initialWorker.email || "";

  const [name, setName] = useState<string>(initialWorkerName);
  const [email, setEmail] = useState<string>(initialWorkerEmail);
  const [workerData, setWorkerData] = useState<Record<string, any>>(() => initialWorker);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const activeToken = session?.token || getWorkerAuthToken() || "";

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      try {
        const response = await workerAPI.me({ summary: true, images: false });
        if (isMounted && response?.worker) {
          const w = response.worker as Record<string, any>;
          setWorkerData(w);
          updateWorkerSession(w);

          const first = w.firstName || w.firstname || "";
          const last = w.lastName || w.lastname || "";
          const fullName = [first, last].filter(Boolean).join(" ").trim() || w.name || w.fullName || "";
          const userEmail = w.email || session?.email || "";

          setName((prev) => (!prev || prev === "Worker" ? fullName || "Worker" : prev));
          setEmail((prev) => (!prev ? userEmail : prev));
        }
      } catch {
        // ignore profile load error
      }
    };
    if (activeToken) {
      void loadProfile();
    }
    return () => {
      isMounted = false;
    };
  }, [activeToken]);

  const currentWorker = workerData && Object.keys(workerData).length > 0 ? workerData : initialWorker;
  const workerAvatar = String(
    currentWorker.avatar || currentWorker.profileImage || currentWorker.photoUrl || currentWorker.image || ""
  ).trim();
  const workerProfession = String(currentWorker.profession || "").trim() || "Profession not set";
  const workerRating =
    Number.isFinite(Number(currentWorker.rating)) && Number(currentWorker.rating) > 0 ? Number(currentWorker.rating) : null;

  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState<number>(0);

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

  useLayoutEffect(() => {
    if (!headerRef.current) return;
    const node = headerRef.current;
    const update = () => setHeaderHeight(node.getBoundingClientRect().height);
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleLogout = () => {
    clearWorkerSession();
    navigate("/", { replace: true });
  };

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return WORKER_FAQ_SECTIONS;
    return WORKER_FAQ_SECTIONS.map((section) => {
      const matchedItems = section.items.filter((item) =>
        item.toLowerCase().includes(term)
      );
      const matchesTitle = section.title.toLowerCase().includes(term);
      return matchesTitle
        ? section
        : { ...section, items: matchedItems };
    }).filter((section) => section.items.length > 0);
  }, [query]);

  const handleOpenSummaryModal = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setFormStatus("");
    if (!activeToken) {
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
      setFormError("Please describe your concern or question in detail.");
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
    if (!activeToken) {
      setFormError("You're not signed in. Please log in to submit a request.");
      setIsSummaryModalOpen(false);
      return;
    }

    setIsSubmitting(true);
    setFormError("");
    setFormStatus("");

    try {
      const result = await submitSupportTicket(activeToken, {
        name: name.trim(),
        email: email.trim(),
        issueCategory: resolvedCategory,
        message: formValues.message.trim(),
      });
      setIsSummaryModalOpen(false);
      setFormStatus("Your ticket is now submitted! Please wait within 24 hours for the reply.");
      setNewTicketId(result.ticketNumber);
      setSupportRefreshKey((prev) => prev + 1);
      setFormValues({ category: "Booking Issue", customCategory: "", message: "" });
    } catch (error: any) {
      setFormError(error?.message || "Unable to send request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const sidebarOffset = headerHeight ? headerHeight + 24 : 88;
  const sidebarHeight = headerHeight ? `calc(100vh - ${headerHeight + 48}px)` : "calc(100vh - 112px)";

  return (
    <div className="min-h-screen bg-[#F9F6F2] font-sans flex flex-col items-center relative text-left">
      <div aria-hidden="true" style={headerHeight ? { height: headerHeight } : undefined} />
      <Header ref={headerRef} onLogoClick={() => navigate("/home-worker")} />

      <div className="w-full max-w-[1280px] flex flex-col lg:flex-row gap-4 lg:gap-6 items-start p-3 sm:p-6 pb-24 lg:pb-6">
        <Sidebar
          location={{ pathname: "/worker-help" }}
          navigate={navigate}
          workerName={name || initialWorkerName || "Worker"}
          workerAvatar={workerAvatar}
          workerProfession={workerProfession}
          workerRating={workerRating}
          onLogout={handleLogout}
          stickyTop={sidebarOffset}
          stickyHeight={sidebarHeight}
        />

        <main className="flex-1 min-w-0 max-w-[1020px] w-full">
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm p-4 sm:p-6 md:p-10">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home-worker"))}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#00A651] mb-6 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              <span>Back</span>
            </button>

            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Worker Help & Support</h1>
              <p className="text-sm text-gray-500 mt-2">
                Find answers to common questions or reach out directly to the TrabaHome Support team.
              </p>
            </div>

            {/* Interactive Guide Banner */}
            <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00A651] text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                  TH
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                    New to TrabaHome? Review Key Features
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Learn how to manage requests, message clients, upload completion proof, and offer up to 8 trades in 4 simple steps.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#00A651] hover:bg-[#008f45] text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer self-start sm:self-center"
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
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A651]/30"
              />
            </div>

            {filteredSections.length === 0 && (
              <div className="text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                No matching help topics found.
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSections.map((section) => (
                <div
                  key={section.title}
                  className="border border-gray-100 rounded-2xl p-5 bg-[#F9FAFB] space-y-3"
                >
                  <h2 className="text-sm font-bold text-[#0B3B68]">{section.title}</h2>
                  <ul className="space-y-2 text-sm text-gray-600">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#00A651]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Support Form */}
            <div id="contact-support" className="mt-12 border-t border-gray-100 pt-10">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Contact Support Team</h2>
                <p className="text-sm text-gray-500 mt-1">Submit an inquiry or report an issue directly to TrabaHome admins.</p>
              </div>
              <div className="space-y-6">
                <div className="text-sm text-gray-600">
                  <p className="text-gray-500">We typically reply within 24 hours.</p>
                  <p className="mt-1">
                    Email:{" "}
                    <a
                      href="mailto:trabahome.official@gmail.com"
                      className="text-[#00A651] font-semibold hover:underline"
                    >
                      trabahome.official@gmail.com
                    </a>
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handleOpenSummaryModal}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Your Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]/30"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Your Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Issue Category</label>
                    <select
                      value={formValues.category}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, category: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A651]/30"
                    >
                      {SUPPORT_ISSUE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isOtherCategory && (
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Specify Category</label>
                      <input
                        type="text"
                        value={formValues.customCategory}
                        onChange={(e) =>
                          setFormValues((prev) => ({ ...prev, customCategory: e.target.value }))
                        }
                        placeholder="e.g. Profile photo upload problem"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#00A651]/30"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">
                      Message <span className="font-normal text-gray-400">({wordCount}/250 words)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formValues.message}
                      onChange={(e) =>
                        setFormValues((prev) => {
                          const words = e.target.value.trim().split(/\s+/).filter(Boolean);
                          if (words.length <= 250) {
                            return { ...prev, message: e.target.value };
                          }
                          const capped = words.slice(0, 250).join(" ");
                          return { ...prev, message: capped };
                        })
                      }
                      placeholder="Please describe your concern or question in detail..."
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#00A651]/30"
                    />
                  </div>

                  {formError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 font-semibold">
                      {formError}
                    </div>
                  )}

                  {formStatus && (
                    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                      <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{formStatus}</p>
                        {newTicketId && (
                          <p className="text-xs text-emerald-700 mt-0.5">Ticket #{newTicketId}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isFormValid || isSubmitting}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#00A651] text-white text-sm font-bold shadow hover:bg-[#008f45] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? "Submitting..." : "Submit Ticket"}</span>
                  </button>
                </form>

                {/* Proofread Summary Modal */}
                {isSummaryModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl border border-gray-100 relative">
                      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Ticket Summary</h3>
                          <p className="text-xs text-gray-500 mt-0.5">Please proofread your ticket before submitting.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => !isSubmitting && setIsSummaryModalOpen(false)}
                          className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors cursor-pointer"
                          aria-label="Close"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="py-4 space-y-3">
                        <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-sm">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs pb-2 border-b border-gray-200/60 gap-1">
                            <span className="font-medium text-gray-500">Name:</span>
                            <span className="font-semibold text-gray-800">{name}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs pb-2 border-b border-gray-200/60 gap-1">
                            <span className="font-medium text-gray-500">Email:</span>
                            <span className="font-semibold text-gray-800">{email}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center text-xs pb-2 border-b border-gray-200/60 gap-1">
                            <span className="font-medium text-gray-500">Issue Category:</span>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#00A651]/10 text-[#00A651]">
                              {resolvedCategory}
                            </span>
                          </div>
                          <div className="pt-1">
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-1.5">
                              <span className="font-medium">Message:</span>
                              <span className="text-[10px]">{wordCount}/250 words</span>
                            </div>
                            <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                              {formValues.message}
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-gray-500 italic text-center">
                          Our team typically replies within 24 hours.
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
                          className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                        >
                          Back to Edit
                        </button>
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleConfirmSubmit}
                          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-[#00A651] text-white hover:bg-[#008f45] transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                        >
                          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          <span>{isSubmitting ? "Submitting..." : "Confirm & Submit"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* My Support Requests / Conversations */}
            <div id="my-support-requests" className="mt-12 border-t border-gray-100 pt-10">
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">My Support Requests</h2>
                <p className="text-sm text-gray-500 mt-1">
                  View and follow up on existing inquiries and messages with TrabaHome support.
                </p>
              </div>

              {activeToken ? (
                <SupportConversation
                  token={activeToken}
                  currentRole="Worker"
                  initialTicketId={newTicketId}
                  refreshKey={supportRefreshKey}
                />
              ) : (
                <div className="text-sm text-gray-500 text-center py-10 border border-dashed border-gray-200 rounded-2xl">
                  Sign in to view your support tickets.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Guide Walkthrough Modal */}
      <WelcomeOnboardingModal
        isOpen={isGuideOpen}
        role="worker"
        userName={name || initialWorkerName || "Partner"}
        onClose={() => setIsGuideOpen(false)}
        onComplete={() => setIsGuideOpen(false)}
      />
    </div>
  );
}