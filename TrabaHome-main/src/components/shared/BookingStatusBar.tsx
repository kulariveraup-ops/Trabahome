import React from 'react';
import { CheckCircle2, Clock, Hourglass, AlertCircle, XCircle, Calendar } from 'lucide-react';
import { isScheduledTimeReached, formatScheduleDateTime } from '../../utils/formatDateTime.ts';

export interface BookingStatusBarProps {
  status?: string;
  rawStatus?: string;
  role: 'homeowner' | 'worker' | 'admin';
  preferredDate?: unknown;
  preferredTime?: unknown;
  scheduledAt?: unknown;
  scheduledDate?: unknown;
  acceptedOn?: unknown;
  isAccepted?: boolean;
  declineReason?: string;
  cancelledReason?: string;
  className?: string;
}

interface StepItem {
  id: number;
  label: string;
  subtitle: string;
  activeSubtitle?: string;
}

export default function BookingStatusBar({
  status = 'Pending',
  rawStatus,
  role,
  preferredDate,
  preferredTime,
  scheduledAt,
  scheduledDate,
  acceptedOn,
  isAccepted: explicitIsAccepted,
  declineReason = '',
  cancelledReason = '',
  className = '',
}: BookingStatusBarProps) {
  const effectiveRaw = String(rawStatus || status || 'Pending').trim();
  const lower = effectiveRaw.toLowerCase();

  const isCompleted = lower === 'completed';
  const isCancelled = lower === 'cancelled' || lower === 'canceled';
  const isDeclined = lower === 'declined' || lower === 'rejected';

  // Check if scheduled date & time has arrived
  const timeReached = isScheduledTimeReached(
    preferredDate,
    preferredTime,
    scheduledAt || scheduledDate
  );

  const accepted =
    Boolean(explicitIsAccepted) ||
    Boolean(acceptedOn) ||
    lower === 'accepted' ||
    lower === 'confirmed' ||
    lower === 'ongoing' ||
    lower === 'in progress' ||
    lower === 'in_progress' ||
    lower === 'inprogress' ||
    isCompleted;

  // In Progress logic: "Will only proceed to this on the scheduled date and time."
  const isInProgress = !isCompleted && accepted && timeReached;

  // Determine active step index: 0 = Request Sent/Received, 1 = Accepted, 2 = In Progress, 3 = Completed
  let activeStepIndex = 0;
  if (isCompleted) {
    activeStepIndex = 3;
  } else if (isInProgress) {
    activeStepIndex = 2;
  } else if (accepted) {
    activeStepIndex = 1;
  } else {
    activeStepIndex = 0;
  }

  // If cancelled or declined, determine the milestone at which it was terminated
  const cancelStepIndex = isCancelled || isDeclined
    ? (accepted ? (isInProgress ? 3 : 2) : 1)
    : -1;

  // Format scheduled date and time
  const formattedSchedule = formatScheduleDateTime(
    preferredDate,
    preferredTime,
    scheduledAt || scheduledDate
  );

  const isHomeowner = role === 'homeowner';

  const steps: StepItem[] = [
    {
      id: 0,
      label: isHomeowner ? 'Request Sent' : 'Request Received',
      subtitle: isHomeowner ? 'Sent the booking' : 'Received the booking',
      activeSubtitle: isHomeowner ? 'Sent the booking' : 'Received the booking',
    },
    {
      id: 1,
      label: 'Accepted',
      subtitle: isHomeowner ? 'Accepted by the worker' : 'Accepted the request',
      activeSubtitle: isHomeowner ? 'Accepted by the worker' : 'Accepted the request',
    },
    {
      id: 2,
      label: 'In Progress',
      subtitle: 'Will only proceed on scheduled date & time',
      activeSubtitle: 'In progress on site',
    },
    {
      id: 3,
      label: 'Completed',
      subtitle: 'Once marked as complete',
      activeSubtitle: 'Marked as complete',
    },
  ];

  const reasonText = (declineReason || cancelledReason || '').trim();

  return (
    <div
      className={`rounded-2xl border ${
        isCancelled || isDeclined
          ? 'border-rose-200 bg-gradient-to-b from-rose-50/25 to-white dark:border-rose-950/60 dark:from-slate-900 dark:to-slate-900'
          : 'border-gray-150 bg-gradient-to-b from-white to-gray-50/70 dark:border-slate-800 dark:from-slate-850 dark:to-slate-900'
      } p-4 sm:p-5 shadow-xs mb-5 text-left ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
            isCancelled || isDeclined
              ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900'
              : 'text-[#0B3B68] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-100 dark:border-blue-900'
          } px-2.5 py-1 rounded-full border`}>
            Booking Status Progress
          </span>
          {isCancelled ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-900 shadow-2xs">
              <XCircle size={13} className="text-rose-600 dark:text-rose-400" />
              Cancelled
            </span>
          ) : isDeclined ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/80 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-900 shadow-2xs">
              <XCircle size={13} className="text-rose-600 dark:text-rose-400" />
              Declined
            </span>
          ) : (
            <span className="text-[11px] font-bold text-gray-700 dark:text-slate-300">
              Step {activeStepIndex + 1} of 4 • {steps[activeStepIndex]?.label}
              {!timeReached && accepted && !isCompleted && (
                <span className="ml-1.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900">
                  Pending Schedule
                </span>
              )}
            </span>
          )}
        </div>

        {/* Scheduled date & time pill */}
        {formattedSchedule && (
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-2.5 py-1 rounded-xl shadow-2xs">
            <Calendar size={12} className="text-[#0B3B68] dark:text-blue-400 shrink-0" />
            <span>Scheduled: <strong className="text-gray-900 dark:text-white font-bold">{formattedSchedule}</strong></span>
          </div>
        )}
      </div>

      {/* Cancelled or Declined Banner */}
      {(isCancelled || isDeclined) && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-200 shadow-2xs">
          <XCircle size={17} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
          <div className="min-w-0">
            <p className="font-bold text-sm">
              {isCancelled ? 'Booking Cancelled' : 'Request Declined'}
            </p>
            {reasonText ? (
              <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300 font-medium">
                Reason: {reasonText}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-rose-700 dark:text-rose-400">
                This service booking has been officially cancelled.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 4-Step Status Bar */}
      <div className="relative">
        {/* Stepper Grid */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 relative">
          {steps.map((step, idx) => {
            const isStepDone = (isCancelled || isDeclined)
              ? idx < cancelStepIndex
              : (isCompleted ? true : idx < activeStepIndex);
            const isCancelPoint = (isCancelled || isDeclined) && idx === cancelStepIndex;
            const isCurrent = !isCancelled && !isDeclined && idx === activeStepIndex;
            const isFuture = (isCancelled || isDeclined)
              ? idx > cancelStepIndex
              : idx > activeStepIndex;

            // Connecting line styling
            let lineClass = 'bg-gray-200 dark:bg-slate-750';
            if (isCancelled || isDeclined) {
              if (idx < cancelStepIndex) {
                lineClass = 'bg-emerald-600 dark:bg-emerald-500';
              } else if (idx === cancelStepIndex) {
                lineClass = 'bg-rose-500 dark:bg-rose-500';
              } else {
                lineClass = 'bg-gray-200 dark:bg-slate-800 border-t border-dashed border-gray-300 dark:border-slate-700';
              }
            } else {
              if (isStepDone || (isCurrent && idx <= activeStepIndex)) {
                lineClass = 'bg-[#0B3B68] dark:bg-blue-500';
              }
            }

            // Circle styling
            let circleClass = 'bg-white dark:bg-slate-850 text-gray-400 border border-gray-200 dark:border-slate-750';
            if (isStepDone) {
              circleClass = 'bg-emerald-600 text-white shadow-emerald-500/20';
            } else if (isCancelPoint) {
              circleClass = 'bg-rose-600 text-white ring-4 ring-rose-100 dark:ring-rose-950/80 shadow-rose-500/30';
            } else if (isCurrent) {
              circleClass = 'bg-[#0B3B68] text-white ring-4 ring-blue-100 dark:ring-blue-950/80 shadow-blue-500/30';
            } else if (isFuture) {
              circleClass = 'bg-gray-100 dark:bg-slate-800 text-gray-300 dark:text-slate-600 border border-gray-200 dark:border-slate-700';
            }

            const stepTitle = isCancelPoint
              ? (isCancelled ? 'Cancelled' : 'Declined')
              : step.label;

            const stepSubtitle = isCancelPoint
              ? (isCancelled ? 'Booking cancelled' : 'Request declined')
              : isCurrent
              ? step.activeSubtitle || step.subtitle
              : step.subtitle;

            return (
              <div key={step.id} className="flex flex-col items-center text-center relative group">
                {/* Connecting line between steps */}
                {idx > 0 && (
                  <div
                    className={`absolute top-4 -left-1/2 w-full h-1 -z-0 transition-colors ${lineClass}`}
                  />
                )}

                {/* Step Circle Badge */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs z-10 transition-all shadow-xs ${circleClass}`}
                >
                  {isStepDone ? (
                    <CheckCircle2 size={16} className="text-white" />
                  ) : isCancelPoint ? (
                    <XCircle size={16} className="text-white" />
                  ) : isCurrent ? (
                    idx === 2 ? (
                      <Hourglass size={15} className="text-white animate-pulse" />
                    ) : (
                      <span>{idx + 1}</span>
                    )
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>

                {/* Step Title */}
                <div className="mt-2.5">
                  <h4
                    className={`text-[11px] sm:text-xs font-bold leading-tight ${
                      isStepDone
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : isCancelPoint
                        ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                        : isCurrent
                        ? 'text-[#0B3B68] dark:text-blue-400 font-extrabold'
                        : isFuture && (isCancelled || isDeclined)
                        ? 'text-gray-300 dark:text-slate-600 line-through'
                        : 'text-gray-400 dark:text-slate-500'
                    }`}
                  >
                    {stepTitle}
                  </h4>

                  {/* Micro Subtitle */}
                  <p
                    className={`text-[9px] sm:text-[10px] mt-0.5 leading-snug hidden sm:block ${
                      isCancelPoint
                        ? 'text-rose-600 dark:text-rose-400 font-semibold'
                        : isCurrent
                        ? 'text-gray-700 dark:text-slate-300 font-semibold'
                        : isStepDone
                        ? 'text-gray-500 dark:text-slate-400'
                        : isFuture && (isCancelled || isDeclined)
                        ? 'text-gray-300 dark:text-slate-600 opacity-50'
                        : 'text-gray-400 dark:text-slate-600'
                    }`}
                  >
                    {stepSubtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile Micro-sublabels row for active step */}
        <div className="sm:hidden mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 text-center">
          {isCancelled || isDeclined ? (
            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1">
              <XCircle size={13} />
              {isCancelled ? 'Booking Cancelled' : 'Request Declined'}
              {reasonText ? ` • ${reasonText}` : ''}
            </p>
          ) : (
            <p className="text-[11px] text-gray-600 dark:text-slate-300">
              <strong className="text-gray-900 dark:text-white font-bold">{steps[activeStepIndex]?.label}:</strong>{' '}
              {steps[activeStepIndex]?.activeSubtitle || steps[activeStepIndex]?.subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
