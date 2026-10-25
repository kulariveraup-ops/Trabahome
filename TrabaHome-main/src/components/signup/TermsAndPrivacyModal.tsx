import React, { useState, useRef, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, ChevronDown, Lock, FileText } from 'lucide-react';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
  userRole?: 'worker' | 'homeowner';
}

export const TermsAndPrivacyModal: React.FC<TermsAndPrivacyModalProps> = ({
  isOpen,
  onClose,
  onAgree,
  userRole = 'worker',
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollDifference = target.scrollHeight - target.scrollTop - target.clientHeight;
    if (scrollDifference <= 20) {
      setHasScrolledToBottom(true);
    }
  };

  const handleAgreeAndClose = () => {
    onAgree();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/65 backdrop-blur-[3px] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/70 dark:bg-slate-850">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#004A8C]/10 dark:bg-blue-900/40 text-[#004A8C] dark:text-blue-400 flex items-center justify-center font-bold">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 id="terms-modal-title" className="text-base sm:text-lg font-bold text-gray-900 dark:text-slate-100">
                Terms &amp; Conditions and Privacy Policy
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                {userRole === 'homeowner'
                  ? 'TrabaHome Homeowner Agreement & Data Protection'
                  : 'TrabaHome Skilled Worker Agreement & Data Protection'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-xs text-gray-700 dark:text-slate-300 leading-relaxed"
        >
          {/* SECTION 1: TERMS & CONDITIONS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
              <FileText size={17} className="text-[#004A8C] dark:text-blue-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#004A8C] dark:text-blue-400">
                {userRole === 'homeowner'
                  ? 'Part 1: Terms & Conditions for Homeowners'
                  : 'Part 1: Terms & Conditions for Skilled Workers'}
              </h3>
            </div>

            {userRole === 'homeowner' ? (
              <>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">1. Platform Nature &amp; Services</h4>
                  <p>
                    TrabaHome is an online coordination and discovery directory connecting Pangasinan homeowners with local skilled workers and tradespeople. 
                    TrabaHome acts as a venue to discover and contact service providers and does not directly employ workers or perform contracting services.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">2. Accurate Account Information</h4>
                  <p>
                    You represent and warrant that the account details provided, including your name, contact phone number, and residential location in Pangasinan, 
                    are truthful and authentic. Creating accounts with fictitious information or impersonating others is prohibited.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">3. Respectful Conduct &amp; Safe Working Environment</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Maintain a safe, welcoming, and respectful environment for workers performing agreed services at your residence.</li>
                    <li>Clearly communicate service requirements, materials needed, and property access details beforehand.</li>
                    <li>Honor agreed quotations and compensation terms settled directly between you and the skilled worker.</li>
                    <li>Harassment, discrimination, verbal abuse, or endangerment of service providers will result in account termination.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">4. Direct Coordination &amp; Payments</h4>
                  <p>
                    Service arrangements, cost estimations, and payment methods are agreed upon directly between you and the skilled worker. 
                    TrabaHome facilitates communication and service tracking, but all final agreements remain between the respective parties.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">5. Community Guidelines &amp; Honest Reviews</h4>
                  <p>
                    Homeowners are encouraged to submit ratings and feedback following completed services. Reviews must be truthful, constructive, 
                    and reflect authentic experiences to help maintain trust in our Pangasinan community.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">1. Platform Nature &amp; Independent Status</h4>
                  <p>
                    TrabaHome is an online coordination and discovery directory that connects Pangasinan homeowners with local skilled workers. 
                    TrabaHome does not employ skilled workers, act as an agency, or control worker schedules. As a worker, you operate as an 
                    independent professional responsible for your tools, pricing quotations, and service quality.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">2. Eligibility and Accurate Credentials</h4>
                  <p>
                    You represent and warrant that all personal and professional information provided, including your name, contact number, 
                    location, and Philippine Government ID, is truthful, authentic, and belongs to you. Submitting false credentials, forged 
                    documents, or impersonating another individual will result in immediate permanent banning and potential legal reporting.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">3. Worker Code of Conduct &amp; Safety</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Treat all homeowners with courtesy, honesty, and professional respect.</li>
                    <li>Arrive on time for agreed appointments or notify homeowners promptly in case of unavoidable delays.</li>
                    <li>Provide honest and transparent cost assessments before commencing any physical labor or purchasing materials.</li>
                    <li>Strictly maintain workplace safety and adhere to standard trade safety precautions.</li>
                    <li>Harassment, intimidation, verbal abuse, substance abuse on job sites, or theft will not be tolerated.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">4. Service Requests &amp; Communication</h4>
                  <p>
                    Homeowners submit service inquiries through TrabaHome. You are free to accept or decline requests based on your availability. 
                    Once a request is accepted, your direct mobile contact information is shared with the homeowner to facilitate coordination. 
                    Payment terms are agreed upon directly between you and the homeowner.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 dark:text-slate-100">5. Account Suspension &amp; Quality Standards</h4>
                  <p>
                    TrabaHome reserves the right to suspend, restrict, or terminate any worker profile that repeatedly receives verified homeowner 
                    complaints, fails identity verification, exhibits fraudulent behavior, or violates community guidelines.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* SECTION 2: PRIVACY POLICY */}
          <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-2">
              <Lock size={17} className="text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Part 2: Privacy Policy (Republic Act No. 10173)
              </h3>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-slate-100">1. Compliance with the Data Privacy Act of 2012</h4>
              <p>
                TrabaHome is committed to protecting your privacy in full compliance with Republic Act No. 10173, otherwise known as the 
                Data Privacy Act of 2012 (DPA), and its implementing rules and regulations.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-slate-100">2. Personal Information Collected</h4>
              <p>During signup and account operation, we collect the following:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Identity Data:</strong> Full Name, Philippine Government ID photo, Selfie holding the ID, ID type and number.</li>
                <li><strong>Contact Data:</strong> Valid Philippine mobile phone number (11 digits) and email address.</li>
                <li><strong>Professional &amp; Location Data:</strong> Primary trade/profession, city/municipality, and barangay in Pangasinan.</li>
                <li><strong>Biometric Data:</strong> Automated facial verification features extracted to confirm your physical presence and identity.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-slate-100">3. Purpose and Legal Basis of Processing</h4>
              <p>
                Your personal data is processed exclusively for the purpose of creating your worker account, verifying your identity against 
                Philippine government ID standards, enabling homeowner booking requests, and maintaining platform security and trust.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-slate-100">4. Data Security and Confidentiality</h4>
              <p>
                All uploaded documents and personal information are transmitted using SSL/TLS encryption and stored on secure cloud servers 
                with strict access controls. Your government ID images and biometrics are never sold, rented, or made publicly accessible. 
                Homeowners can only see your public profile: name, profession, verified badge, ratings, and service location.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-gray-900 dark:text-slate-100">5. Your Data Subject Rights</h4>
              <p>
                Under the Data Privacy Act of 2012, you have the right to be informed, access, correct, or request the deletion of your 
                personal information stored on TrabaHome by contacting our support team.
              </p>
            </div>

            {/* End of Document Confirmation */}
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 p-4 text-center">
              <CheckCircle2 size={24} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-1.5" />
              <p className="font-bold text-emerald-900 dark:text-emerald-200">
                You have reached the end of the document.
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                By clicking "I Have Read &amp; Agree", you confirm that you have read, understood, and accepted both the Terms &amp; Conditions and Privacy Policy.
              </p>
            </div>
          </div>
        </div>

        {/* Footer with Acceptance Button */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gray-50/70 dark:bg-slate-850">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAgreeAndClose}
            disabled={!hasScrolledToBottom}
            className={`
              px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer
              ${
                hasScrolledToBottom
                  ? 'bg-[#004A8C] hover:bg-[#003666] active:scale-95 text-white shadow-md shadow-blue-500/20'
                  : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700'
              }
            `}
          >
            <CheckCircle2 size={16} />
            <span>{hasScrolledToBottom ? 'I Have Read & Agree' : 'Scroll to End to Agree'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default TermsAndPrivacyModal;
