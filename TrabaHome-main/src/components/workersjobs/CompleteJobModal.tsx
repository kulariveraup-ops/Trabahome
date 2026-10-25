import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  DollarSign,
  FileText,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  Receipt,
  Star,
  User,
} from "lucide-react";
import type { Job } from "../../types/Job.types.ts";

export interface CompleteJobModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmComplete: (
    jobId: string,
    completionDetails: {
      proofOfWork: string[];
      proofOfPayment: string[];
      paymentAmount: number;
      jobSummary: string;
    },
    homeownerReview?: {
      rating: number;
      reviewText: string;
      reviewTags: string[];
    }
  ) => Promise<void>;
}

const HOMEOWNER_POSITIVE_TAGS = [
  "Polite & Respectful",
  "Prompt Payment",
  "Clear Instructions",
  "Pleasant Workplace",
  "Safe Working Area",
  "Highly Recommended",
];

const HOMEOWNER_NEGATIVE_TAGS = [
  "Delayed Payment",
  "Difficult Communication",
  "Unclear Instructions",
  "Unsafe Worksite",
  "Unreasonable Demands",
  "Not Recommended",
];

const compressImageFile = (file: File, maxDimension = 1280, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(event.target?.result || ""));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(event.target?.result || "");
    };
    reader.readAsDataURL(file);
  });
};

export default function CompleteJobModal({
  job,
  isOpen,
  onClose,
  onConfirmComplete,
}: CompleteJobModalProps) {
  const [step, setStep] = useState<"edit" | "proofread">("edit");
  const [photos, setPhotos] = useState<string[]>([]);
  const [paymentPhotos, setPaymentPhotos] = useState<string[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [jobSummary, setJobSummary] = useState<string>("");
  const [homeownerRating, setHomeownerRating] = useState<number>(5);
  const [homeownerReviewText, setHomeownerReviewText] = useState<string>("");
  const [homeownerReviewTags, setHomeownerReviewTags] = useState<string[]>([
    "Polite & Respectful",
    "Prompt Payment",
  ]);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isProcessingImages, setIsProcessingImages] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const paymentFileInputRef = useRef<HTMLInputElement | null>(null);

  const handleRatingChange = (star: number) => {
    const wasLow = homeownerRating <= 2;
    const isNowLow = star <= 2;
    setHomeownerRating(star);
    if (wasLow !== isNowLow) {
      setHomeownerReviewTags(isNowLow ? ["Delayed Payment"] : ["Polite & Respectful", "Prompt Payment"]);
    }
  };

  if (!isOpen || !job) return null;

  const handleClose = () => {
    if (isSubmitting || isProcessingImages) return;
    setStep("edit");
    setPhotos([]);
    setPaymentPhotos([]);
    setAmount("");
    setJobSummary("");
    setErrorMsg("");
    setShowConfirmDialog(false);
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg("");
    const fileList = Array.from(files);

    if (photos.length >= 5) {
      setErrorMsg("You can only upload a maximum of 5 proof-of-work images.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const availableSlots = 5 - photos.length;
    if (fileList.length > availableSlots) {
      setErrorMsg(`You can only upload up to 5 photos total. Only ${availableSlots} more will be added.`);
    }

    const filesToUpload = fileList.slice(0, availableSlots);
    setIsProcessingImages(true);

    try {
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          setErrorMsg("Only image files are accepted.");
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          setErrorMsg("Each image must be under 20MB.");
          continue;
        }

        const compressed = await compressImageFile(file);
        setPhotos((prev) => {
          if (prev.length >= 5) return prev;
          return [...prev, compressed];
        });
      }
    } catch (err) {
      console.error("Error compressing proof of work image:", err);
      setErrorMsg("Failed to process image. Please try another photo.");
    } finally {
      setIsProcessingImages(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaymentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg("");
    const fileList = Array.from(files);

    if (paymentPhotos.length >= 3) {
      setErrorMsg("You can only upload a maximum of 3 proof-of-payment images.");
      if (paymentFileInputRef.current) paymentFileInputRef.current.value = "";
      return;
    }

    const availableSlots = 3 - paymentPhotos.length;
    if (fileList.length > availableSlots) {
      setErrorMsg(`You can only upload up to 3 payment photos total. Only ${availableSlots} more will be added.`);
    }

    const filesToUpload = fileList.slice(0, availableSlots);
    setIsProcessingImages(true);

    try {
      for (const file of filesToUpload) {
        if (!file.type.startsWith("image/")) {
          setErrorMsg("Only image files are accepted.");
          continue;
        }
        if (file.size > 20 * 1024 * 1024) {
          setErrorMsg("Each image must be under 20MB.");
          continue;
        }

        const compressed = await compressImageFile(file);
        setPaymentPhotos((prev) => {
          if (prev.length >= 3) return prev;
          return [...prev, compressed];
        });
      }
    } catch (err) {
      console.error("Error compressing payment image:", err);
      setErrorMsg("Failed to process payment image. Please try another photo.");
    } finally {
      setIsProcessingImages(false);
      if (paymentFileInputRef.current) {
        paymentFileInputRef.current.value = "";
      }
    }
  };

  const removePaymentPhoto = (index: number) => {
    setPaymentPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGoToProofread = () => {
    setErrorMsg("");
    if (photos.length < 2) {
      setErrorMsg(`Please upload at least 2 proof-of-work images (currently ${photos.length} uploaded). Images must be between 2 and 5.`);
      return;
    }
    if (photos.length > 5) {
      setErrorMsg("You can only upload a maximum of 5 proof-of-work images.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter a valid payment amount in PHP greater than 0.");
      return;
    }
    if (paymentPhotos.length < 1) {
      setErrorMsg(`Please upload at least 1 proof-of-payment image (currently ${paymentPhotos.length} uploaded). Proof of payment is required (1 to 3 images).`);
      return;
    }
    if (paymentPhotos.length > 3) {
      setErrorMsg("You can only upload a maximum of 3 proof-of-payment images.");
      return;
    }
    if (!jobSummary.trim()) {
      setErrorMsg("Please provide a brief job summary of the work performed.");
      return;
    }
    if (!homeownerRating || homeownerRating < 1) {
      setErrorMsg("Please provide a rating (1-5 stars) for the homeowner.");
      return;
    }
    if (homeownerReviewTags.length === 0) {
      setErrorMsg("Please select at least one feedback tag for the homeowner.");
      return;
    }

    setStep("proofread");
  };

  const handleFinalSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    setIsSubmitting(true);
    setErrorMsg("");
    try {
      await onConfirmComplete(
        job.id,
        {
          proofOfWork: photos,
          proofOfPayment: paymentPhotos,
          paymentAmount: parsedAmount,
          jobSummary: jobSummary.trim(),
        },
        {
          rating: homeownerRating,
          reviewText: homeownerReviewText.trim(),
          reviewTags: homeownerReviewTags,
        }
      );
      handleClose();
    } catch (err: any) {
      console.error("Failed to complete job", err);
      setErrorMsg(err?.message || "Failed to complete job. Please try again.");
      setShowConfirmDialog(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const formattedAmount = `₱ ${parsedAmount.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const activeReviewTags = homeownerRating <= 2 ? HOMEOWNER_NEGATIVE_TAGS : HOMEOWNER_POSITIVE_TAGS;

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="relative bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden text-left animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-white dark:from-slate-850 dark:to-slate-900 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#00A651]/10 dark:bg-[#00A651]/20 flex items-center justify-center text-[#00A651]">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {step === "edit" ? "Complete Job & E-Receipt" : "Proofread Completion Details"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400">
                  {step === "edit"
                    ? "Upload proof of work and provide billing details"
                    : "Review all details before finalizing completion"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
            {/* Job Summary Banner */}
            <div className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 rounded-2xl text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Job Reference</p>
                <p className="font-bold text-[#0B3B68] dark:text-blue-400">{job.requestNumber || job.id}</p>
                <p className="text-gray-600 dark:text-slate-300 mt-0.5">{job.name} • <span className="text-[#00AF91]">{job.needs}</span></p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-slate-500">Status</p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                  Ready to Complete
                </span>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {step === "edit" ? (
              <>
                {/* 1. PROOF OF WORK */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-[#0B3B68] dark:text-blue-400" />
                      PROOF OF WORK *
                    </label>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        photos.length >= 2 && photos.length <= 5
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                      }`}
                    >
                      {photos.length} / 5 photos
                    </span>
                  </div>

                  {/* Upload button area */}
                  <div
                    onClick={() => {
                      if (isProcessingImages) return;
                      if (photos.length >= 5) {
                        setErrorMsg("Maximum 5 photos reached. Remove an image to upload another.");
                        return;
                      }
                      fileInputRef.current?.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                      photos.length >= 5 || isProcessingImages
                        ? "border-gray-200 dark:border-slate-700 bg-gray-100/70 dark:bg-slate-800/40 cursor-not-allowed opacity-75"
                        : "border-gray-200 dark:border-slate-700 hover:border-[#00AF91] dark:hover:border-[#00AF91] bg-gray-50/60 dark:bg-slate-850 hover:bg-emerald-50/20 dark:hover:bg-slate-800"
                    }`}
                  >
                    {isProcessingImages ? (
                      <div className="flex flex-col items-center justify-center py-1">
                        <Loader2 className="w-6 h-6 text-[#00AF91] animate-spin mb-1.5" />
                        <p className="text-xs font-semibold text-[#00AF91]">Optimizing &amp; compressing photos...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 dark:text-slate-500 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                          {photos.length >= 5 ? "Maximum 5 photos uploaded" : "Click to upload photos"}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">
                          Upload 2 to 5 photos • PNG, JPG up to 20MB each (auto-compressed)
                        </p>
                      </>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={photos.length >= 5 || isProcessingImages}
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>

                  {/* Thumbnail gallery */}
                  {photos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
                      {photos.map((src, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 group">
                          <img src={src} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePhoto(index);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition"
                            title="Remove photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded font-bold">
                            #{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Amount in PHP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-[#00AF91]" />
                    Amount Received / Total in PHP (₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 dark:text-slate-500">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 1500.00"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold text-gray-800 dark:text-slate-100 focus:outline-none focus:border-[#0B3B68] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#0B3B68]"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-slate-500">Enter the final service charge agreed with the homeowner.</p>
                </div>

                {/* 3. PROOF OF PAYMENT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Receipt className="w-4 h-4 text-[#00AF91]" />
                      PROOF OF PAYMENT *
                    </label>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        paymentPhotos.length >= 1 && paymentPhotos.length <= 3
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                          : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                      }`}
                    >
                      {paymentPhotos.length} / 3 photos
                    </span>
                  </div>

                  <div
                    onClick={() => {
                      if (isProcessingImages) return;
                      if (paymentPhotos.length >= 3) {
                        setErrorMsg("Maximum 3 payment photos reached. Remove an image to upload another.");
                        return;
                      }
                      paymentFileInputRef.current?.click();
                    }}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-colors ${
                      paymentPhotos.length >= 3 || isProcessingImages
                        ? "border-gray-200 dark:border-slate-700 bg-gray-100/70 dark:bg-slate-800/40 cursor-not-allowed opacity-75"
                        : "border-gray-200 dark:border-slate-700 hover:border-[#00AF91] dark:hover:border-[#00AF91] bg-gray-50/60 dark:bg-slate-850 hover:bg-emerald-50/20 dark:hover:bg-slate-800"
                    }`}
                  >
                    {isProcessingImages ? (
                      <div className="flex flex-col items-center justify-center py-1">
                        <Loader2 className="w-6 h-6 text-[#00AF91] animate-spin mb-1.5" />
                        <p className="text-xs font-semibold text-[#00AF91]">Optimizing &amp; compressing photos...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 dark:text-slate-500 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-gray-700 dark:text-slate-200">
                          {paymentPhotos.length >= 3 ? "Maximum 3 payment photos uploaded" : "Click to upload proof of payment"}
                        </p>
                        <p className="text-[11px] text-gray-400 dark:text-slate-400 mt-0.5">
                          Upload receipt, GCash screenshot, bank transfer or cash acknowledgment • PNG, JPG up to 20MB (auto-compressed)
                        </p>
                      </>
                    )}
                    <input
                      ref={paymentFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={paymentPhotos.length >= 3 || isProcessingImages}
                      className="hidden"
                      onChange={handlePaymentFileChange}
                    />
                  </div>

                  {paymentPhotos.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2">
                      {paymentPhotos.map((src, index) => (
                        <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 group">
                          <img src={src} alt={`Payment Proof ${index + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removePaymentPhoto(index);
                            }}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition"
                            title="Remove photo"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded font-bold">
                            #{index + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Job Summary */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#0B3B68] dark:text-blue-400" />
                    Job Summary &amp; Work Description *
                  </label>
                  <textarea
                    rows={4}
                    value={jobSummary}
                    onChange={(e) => setJobSummary(e.target.value)}
                    placeholder="Describe the tasks completed, issues repaired, materials installed, etc..."
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-gray-800 dark:text-slate-100 focus:outline-none focus:border-[#0B3B68] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#0B3B68]"
                  />
                </div>

                {/* 5. Review Homeowner (Mandatory) */}
                <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      Rate &amp; Review Homeowner *
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-full">
                      Mandatory
                    </span>
                  </div>

                  {/* Star Rating */}
                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mb-1.5">
                      How was your experience working with {job.name || "this homeowner"}?
                    </p>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => handleRatingChange(star)}
                          className="p-1 cursor-pointer transition-transform hover:scale-110"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= homeownerRating
                                ? "text-amber-400 fill-amber-400"
                                : "text-gray-300 dark:text-slate-600"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-xs font-bold text-gray-700 dark:text-slate-300">
                        {homeownerRating === 5
                          ? "5.0 - Excellent"
                          : homeownerRating === 4
                          ? "4.0 - Good"
                          : homeownerRating === 3
                          ? "3.0 - Fair"
                          : homeownerRating === 2
                          ? "2.0 - Poor"
                          : "1.0 - Very Poor"}
                      </span>
                    </div>
                  </div>

                  {/* Quick Tags */}
                  <div>
                    <p className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mb-1.5">
                      Select tags that describe your experience:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activeReviewTags.map((tag) => {
                        const isSelected = homeownerReviewTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isSelected) {
                                setHomeownerReviewTags((prev) => prev.filter((t) => t !== tag));
                              } else {
                                setHomeownerReviewTags((prev) => [...prev, tag]);
                              }
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                              isSelected
                                ? "bg-[#0B3B68] text-white border-[#0B3B68] dark:bg-blue-600 dark:border-blue-600 shadow-xs"
                                : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-750"
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Feedback Text */}
                  <div>
                    <textarea
                      rows={2}
                      value={homeownerReviewText}
                      onChange={(e) => setHomeownerReviewText(e.target.value)}
                      placeholder="Optional feedback about the homeowner, communication, worksite readiness, etc..."
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-gray-800 dark:text-slate-100 focus:outline-none focus:border-[#0B3B68] dark:focus:border-blue-500 focus:ring-1 focus:ring-[#0B3B68]"
                    />
                  </div>
                </div>
              </>
            ) : (
              /* PROOFREAD VIEW */
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/50 dark:bg-slate-800/80 border border-emerald-100 dark:border-slate-700 rounded-2xl space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100 dark:border-slate-700">
                    <span className="font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Payment Amount</span>
                    <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 font-mono">{formattedAmount}</span>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Job Summary</span>
                    <p className="text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-3 rounded-xl border border-emerald-100/60 dark:border-slate-700 leading-relaxed">
                      {jobSummary}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                      PROOF OF WORK ({photos.length} photos)
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {photos.map((src, index) => (
                        <div key={index} className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800">
                          <img src={src} alt={`Proof ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide block mb-1.5">
                      PROOF OF PAYMENT ({paymentPhotos.length} photos)
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {paymentPhotos.map((src, index) => (
                        <div key={index} className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800">
                          <img src={src} alt={`Payment Proof ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-emerald-100 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Homeowner Review</span>
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{homeownerRating}.0 / 5.0</span>
                      </div>
                    </div>
                    {homeownerReviewTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {homeownerReviewTags.map((t) => (
                          <span key={t} className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 text-[10px] font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {homeownerReviewText && (
                      <p className="text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-emerald-100/60 dark:border-slate-700 leading-relaxed text-xs">
                        "{homeownerReviewText}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <span>
                    Proofreading ensures your e-receipt accurately reflects the completed job before final submission.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50/50 dark:bg-slate-850 shrink-0">
            {step === "edit" ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGoToProofread}
                  className="px-6 py-2.5 rounded-xl bg-[#0B3B68] text-white text-xs font-bold hover:bg-[#082d50] dark:bg-blue-600 dark:hover:bg-blue-700 transition shadow-sm cursor-pointer"
                >
                  Proceed
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setStep("edit")}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Edit
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#00A651] text-white text-xs font-bold hover:bg-[#008f45] transition shadow-md cursor-pointer"
                >
                  Confirm &amp; Mark Completed
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Final Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[125] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-white">Mark Job as Completed?</h4>
            <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">
              Are you sure you want to mark this job as completed? This will generate the final official E-Receipt and notify the homeowner. This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void handleFinalSubmit()}
                className="flex-1 py-2.5 rounded-xl bg-[#00A651] text-white text-xs font-bold hover:bg-[#008f45] transition shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Yes, Mark Done"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
