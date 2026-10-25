import React, { useState, useEffect } from 'react';
import StepOne from '../components/signup/StepOne.tsx';
import StepThree from '../components/signup/StepThree.tsx';
import WorkerSignupSummaryModal from '../components/signup/WorkerSignupSummaryModal.tsx';
import type { WorkerSignupFormData, SignupErrors } from '../types/Worker.types.ts';
import { useNavigate } from 'react-router-dom';
import { workerAPI } from '../services/WorkerApi.ts';
import { validateStep1 } from '../utils/Validation.ts';
import { saveWorkerSession } from '../utils/workerAuth.ts';

const WorkerSignup: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // ID Verification State
  const [isAiVerifying, setIsAiVerifying] = useState<boolean>(false);
  const [aiVerificationError, setAiVerificationError] = useState<string | null>(null);

  const [formData, setFormData] = useState<WorkerSignupFormData>({
    // Step 1 Fields
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
    agreeToPrivacy: false,

    // Step 2 Fields: Philippine Valid ID & Selfie
    idType: '',
    idFront: null,
    idFrontPreview: null,
    idBack: null,
    idBackPreview: null,
    selfie: null,
    selfiePreview: null,
    idNumber: '',
    surname: '',
    givenName: '',
    middleName: '',
    dateOfBirth: '',
    nationality: '',
    nationalityOther: '',
    sex: '',
    placeOfBirth: '',
    dateOfIssue: '',
    expiryDate: '',
    issuingAuthority: '',

    // Step 3 Fields: Trade and Location
    profession: '',
    province: 'Pangasinan',
    city: '',
    barangay: '',
    proofOfWork: [],
    proofOfWorkPreviews: [],

    // Verification State
    aiVerificationStatus: 'idle',
    aiVerificationError: null,
    aiVerificationResult: null,
  });

  const [errors, setErrors] = useState<SignupErrors>({});

  // Handle input changes for text fields and selects
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, type } = e.target as HTMLInputElement;
    
    const value = type === 'checkbox'
      ? (e.target as HTMLInputElement).checked
      : e.target.value;

    setFormData(prev => {
      // If changing idType, reset verification status so it checks automatically
      if (name === 'idType') {
        return {
          ...prev,
          idType: value as string,
          aiVerificationStatus: 'idle',
          aiVerificationResult: null,
          aiVerificationError: null,
        };
      }
      return {
        ...prev,
        [name]: value
      };
    });

    if (name === 'idType') {
      setAiVerificationError(null);
    }

    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle ID Card Upload
  const handleIdCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          idFront: file,
          idFrontPreview: reader.result as string,
          aiVerificationStatus: 'idle',
          aiVerificationResult: null,
          aiVerificationError: null,
        }));
        setAiVerificationError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveIdCard = () => {
    setFormData(prev => ({
      ...prev,
      idFront: null,
      idFrontPreview: null,
      aiVerificationStatus: 'idle',
      aiVerificationResult: null,
      aiVerificationError: null,
    }));
    setAiVerificationError(null);
  };

  // Handle Selfie with ID Upload
  const handleSelfieUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          selfie: file,
          selfiePreview: reader.result as string,
          aiVerificationStatus: 'idle',
          aiVerificationResult: null,
          aiVerificationError: null,
        }));
        setAiVerificationError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveSelfie = () => {
    setFormData(prev => ({
      ...prev,
      selfie: null,
      selfiePreview: null,
      aiVerificationStatus: 'idle',
      aiVerificationResult: null,
      aiVerificationError: null,
    }));
    setAiVerificationError(null);
  };

  // Handle automatic ID verification
  const handleVerifyIdAutomatically = async () => {
    if (!formData.idType || !formData.idFront || !formData.selfie) {
      return;
    }

    setIsAiVerifying(true);
    setAiVerificationError(null);
    setFormData(prev => ({ ...prev, aiVerificationStatus: 'verifying' }));

    try {
      const verifyFormData = new FormData();
      verifyFormData.append('idCard', formData.idFront);
      verifyFormData.append('selfie', formData.selfie);
      verifyFormData.append('idType', formData.idType);
      verifyFormData.append('firstName', formData.firstName);
      verifyFormData.append('lastName', formData.lastName);

      const res = await workerAPI.verifyId(verifyFormData);

      if (res.success && res.isVerified) {
        setFormData(prev => ({
          ...prev,
          aiVerificationStatus: 'verified',
          idNumber: res.details?.ocr?.extractedIdNumber || prev.idNumber || '',
          aiVerificationResult: res as any,
          aiVerificationError: null,
        }));
        setAiVerificationError(null);
      } else {
        const errorReason = res.reason || 'Verification could not be completed. Please re-upload a clear valid Philippine Government ID and selfie.';
        setFormData(prev => ({
          ...prev,
          aiVerificationStatus: 'failed',
          aiVerificationResult: res as any,
          aiVerificationError: errorReason,
        }));
        setAiVerificationError(errorReason);
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.reason ||
        err?.response?.data?.message ||
        err?.message ||
        'Verification failed. Please re-upload a clear valid Philippine Government ID and selfie.';
      setFormData(prev => ({
        ...prev,
        aiVerificationStatus: 'failed',
        aiVerificationError: msg,
      }));
      setAiVerificationError(msg);
    } finally {
      setIsAiVerifying(false);
    }
  };

  // Automatically check the uploaded files when ID type, ID front, and selfie are present
  useEffect(() => {
    if (
      formData.idType &&
      formData.idFront &&
      formData.selfie &&
      formData.aiVerificationStatus === 'idle' &&
      !isAiVerifying
    ) {
      handleVerifyIdAutomatically();
    }
  }, [formData.idType, formData.idFront, formData.selfie, formData.aiVerificationStatus, isAiVerifying]);

  // Handle proof of work uploads (multiple files for Step 3)
  const handleProofOfWorkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;

    if (files && files.length > 0) {
      const fileArray = Array.from(files);
      const newPreviews: string[] = [];

      fileArray.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);

          if (newPreviews.length === fileArray.length) {
            setFormData(prev => ({
              ...prev,
              proofOfWork: [...prev.proofOfWork, ...fileArray],
              proofOfWorkPreviews: [...prev.proofOfWorkPreviews, ...newPreviews]
            }));
          }
        };
        reader.readAsDataURL(file);
      });

      if (errors.proofOfWork) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.proofOfWork;
          return newErrors;
        });
      }
    }
  };

  // Handle password toggle
  const handleTogglePassword = (field: 'password' | 'confirmPassword') => {
    if (field === 'password') {
      setShowPassword(prev => !prev);
    } else {
      setShowConfirmPassword(prev => !prev);
    }
  };

  // Navigate to next step after validating Step 1
  const handleStep1Next = async () => {
    const step1Errors = validateStep1(formData);

    if (Object.keys(step1Errors).length > 0) {
      setErrors(step1Errors);
      return;
    }

    try {
      const res = await workerAPI.checkEmailAvailability(formData.email.trim());
      if (!res?.available) {
        setErrors({ email: res?.message || 'This email is already registered as a skilled worker.' });
        return;
      }
    } catch {
      // Allow fallback if network issue
    }

    setErrors({});
    setStep(2);
  };

  // ── Open review and proofreading summary modal ────────────────
  const handleOpenReview = () => {
    const newErrors: SignupErrors = {};

    if (!formData.profession) newErrors.profession = 'Profession is required';
    if (!formData.city) newErrors.city = 'City is required';
    if (!formData.barangay) newErrors.barangay = 'Barangay is required';

    // Validate Philippine ID and verification
    if (!formData.idType) newErrors.idType = 'Philippine Valid ID type is required';
    if (!formData.idFront) newErrors.idUpload = 'Please upload a photo of your valid ID';
    if (!formData.selfie) newErrors.selfieUpload = 'Please upload a selfie holding your ID';

    const isAiVerified = formData.aiVerificationStatus === 'verified' || formData.aiVerificationResult?.isVerified === true;
    if (!isAiVerified) {
      if (formData.aiVerificationStatus === 'failed') {
        newErrors.aiVerification = 'ID verification failed. Please re-upload your valid ID and selfie.';
      } else if (isAiVerifying) {
        newErrors.aiVerification = 'Checking your uploaded documents. Please wait a moment.';
      } else {
        newErrors.aiVerification = 'Please upload a valid Philippine ID and selfie to complete ID verification.';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSummaryOpen(true);
  };

  // ── Handle final submission after proofreading ─────────────────
  const handleFinalSubmit = async () => {
    setIsLoading(true);
    setSubmitError(null);

    try {
      const payload = new FormData();

      // Step 1 fields
      payload.append('firstName',      formData.firstName);
      payload.append('lastName',       formData.lastName);
      payload.append('email',          formData.email);
      payload.append('phone',          formData.phone);
      payload.append('password',       formData.password);
      payload.append('agreeToTerms',   String(formData.agreeToTerms));
      payload.append('agreeToPrivacy', String(formData.agreeToPrivacy));

      // Work and location fields
      payload.append('profession', formData.profession);
      payload.append('province',   formData.province);
      payload.append('city',       formData.city);
      payload.append('barangay',   formData.barangay);

      // Philippine Government ID and Selfie
      if (formData.idType) payload.append('idType', formData.idType);
      if (formData.idNumber) payload.append('idNumber', formData.idNumber);
      if (formData.idFront) payload.append('idCard', formData.idFront);
      if (formData.selfie) payload.append('selfie', formData.selfie);

      // Verification payload
      const isVerified = formData.aiVerificationStatus === 'verified' || formData.aiVerificationResult?.isVerified === true;
      payload.append('aiVerificationPassed', String(isVerified));
      if (formData.aiVerificationResult) {
        payload.append('aiVerificationData', JSON.stringify(formData.aiVerificationResult));
      }

      // Proof of work files
      formData.proofOfWork.forEach((file) => {
        payload.append('proofOfWork', file);
      });

      const res = await workerAPI.register(payload);

      if (res?.token) {
        saveWorkerSession({
          token: res.token,
          email: res.email || formData.email,
          worker: (res.worker || res.data) as any,
        });
      }

      try {
        localStorage.removeItem("trabahome_first_login_pending_" + String(formData.email || "").trim().toLowerCase());
        sessionStorage.setItem("trabahome_show_first_time_guide", "true");
      } catch {}

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("trabahome:user-registered", { detail: { role: "worker" } }));
        window.dispatchEvent(new CustomEvent("trabahome:worker-changed"));
        window.dispatchEvent(new CustomEvent("trabahome:dashboard-refresh"));
        try {
          localStorage.setItem("trabahome_sync_worker", String(Date.now()));
          Object.keys(localStorage).forEach((k) => {
            if (k.startsWith("trabahome_worker_list")) {
              localStorage.removeItem(k);
            }
          });
        } catch {}
      }

      setIsSummaryOpen(false);
      navigate("/home-worker", { replace: true });
    } catch (error: any) {
      const serverMessage =
        error?.response?.data?.message ||
        (Array.isArray(error?.response?.data?.errors)
          ? error.response.data.errors.join(', ')
          : null);
      const message = serverMessage || error?.message || 'Unable to submit. Please try again.';
      setSubmitError(message);
      console.error('Worker signup error:', error?.response?.data || error?.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FB] dark:bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[20px] border border-gray-100 dark:border-slate-800 shadow-[0_18px_50px_rgba(15,23,42,0.08)] p-8">
        {/* Progress Indicator */}
        <div className="flex items-center justify-between mb-8">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 cursor-pointer transition-all ${step >= 1 ? 'text-[#004A8C] dark:text-blue-400' : 'text-gray-300 dark:text-slate-600'}`}
            title="Step 1: Account Details"
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 1 ? 'bg-[#004A8C] text-white shadow-[0_2px_8px_rgba(0,74,140,0.35)]' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
            }`}>
              1
            </div>
            <span className="text-sm font-semibold">Account</span>
          </button>

          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#004A8C] dark:text-blue-400' : 'text-gray-300 dark:text-slate-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step >= 2 ? 'bg-[#004A8C] text-white shadow-[0_2px_8px_rgba(0,74,140,0.35)]' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'
            }`}>
              2
            </div>
            <span className="text-sm font-semibold">Professional &amp; ID Verification</span>
          </div>
        </div>

        {/* Step Content */}
        {step === 1 && (
          <StepOne
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onTogglePassword={handleTogglePassword}
            showPassword={showPassword}
            showConfirmPassword={showConfirmPassword}
            onNext={handleStep1Next}
          />
        )}

        {step === 2 && (
          <StepThree
            formData={formData}
            errors={errors}
            onInputChange={handleInputChange}
            onIdCardUpload={handleIdCardUpload}
            onSelfieUpload={handleSelfieUpload}
            onRemoveIdCard={handleRemoveIdCard}
            onRemoveSelfie={handleRemoveSelfie}
            isAiVerifying={isAiVerifying}
            aiVerificationError={aiVerificationError}
            onProofOfWorkUpload={handleProofOfWorkUpload}
            onSubmit={handleOpenReview}
            onBack={() => setStep(1)}
            isLoading={isLoading}
          />
        )}

        {/* API Error Message */}
        {submitError && (
          <p className="text-center text-sm text-red-500 mt-4 font-semibold">
            {submitError}
          </p>
        )}
      </div>

      {/* Proofreading Summary Modal */}
      <WorkerSignupSummaryModal
        isOpen={isSummaryOpen}
        formData={formData}
        isLoading={isLoading}
        onClose={() => setIsSummaryOpen(false)}
        onConfirm={handleFinalSubmit}
        onEditStep={(targetStep) => {
          setIsSummaryOpen(false);
          setStep(targetStep);
        }}
      />
    </div>
  );
};

export default WorkerSignup;
