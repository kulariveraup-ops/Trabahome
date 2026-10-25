import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  MapPin,
  ArrowRight
} from 'lucide-react';
import type { Request } from '../../types/Worker.types.ts';

interface WorkerScheduleCalendarProps {
  requests: Request[];
  onViewDetails?: (request: Request) => void;
}

const getLocalDateString = (d: Date = new Date()): string => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function WorkerScheduleCalendar({
  requests,
  onViewDetails,
}: WorkerScheduleCalendarProps) {
  // Live Clock with seconds
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = useMemo(() => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }, [currentTime]);

  const dateString = useMemo(() => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [currentTime]);

  const todayStr = useMemo(() => getLocalDateString(currentTime), [currentTime]);
  const maxDateStr = useMemo(() => {
    const d = new Date(currentTime);
    d.setDate(d.getDate() + 90);
    return getLocalDateString(d);
  }, [currentTime]);

  // Calendar State
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => getLocalDateString(new Date()));

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthName = useMemo(() => {
    return currentMonthDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentMonthDate]);

  // Map requests by Date String "YYYY-MM-DD"
  const requestsByDate = useMemo(() => {
    const map = new Map<string, Request[]>();
    requests.forEach((req) => {
      let dateKey = '';
      const rawDate = (req as any).completedAt || req.preferredDate || (req as any).scheduledAt;
      if (rawDate) {
        if (typeof rawDate === 'string') {
          const match = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            dateKey = `${match[1]}-${match[2]}-${match[3]}`;
          } else {
            try {
              const parsed = new Date(rawDate);
              if (!Number.isNaN(parsed.getTime())) {
                dateKey = getLocalDateString(parsed);
              }
            } catch {}
          }
        } else if (rawDate instanceof Date) {
          dateKey = getLocalDateString(rawDate);
        }
      }
      if (!dateKey && req.schedule) {
        try {
          const parsed = new Date(req.schedule);
          if (!Number.isNaN(parsed.getTime())) {
            dateKey = getLocalDateString(parsed);
          }
        } catch {}
      }

      if (dateKey) {
        const existing = map.get(dateKey) || [];
        existing.push(req);
        map.set(dateKey, existing);
      }
    });
    return map;
  }, [requests]);

  // Calendar matrix days
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    // Prev month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDayNum = daysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDayNum).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: prevDayNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Next month padding to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: n,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    return days;
  }, [year, month, todayStr]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleTodayJump = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDateStr(getLocalDateString(now));
  };

  const isSelectedDatePast = selectedDateStr < todayStr;
  const isSelectedDateToday = selectedDateStr === todayStr;
  const isSelectedDateFuture = selectedDateStr > todayStr;

  // Selected date requests (previous days strictly show completed bookings)
  const selectedDateBookings = useMemo(() => {
    const all = requestsByDate.get(selectedDateStr) || [];
    if (isSelectedDatePast) {
      return all.filter((b) =>
        ['completed', 'done'].includes(String(b.status || b.rawStatus).toLowerCase())
      );
    }
    return all;
  }, [requestsByDate, selectedDateStr, isSelectedDatePast]);

  const selectedDateFormatted = useMemo(() => {
    try {
      const [y, m, d] = selectedDateStr.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm mb-10 text-left">
      {/* Top Header: Clock + Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#004A8C] flex items-center justify-center font-bold">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Work Schedule &amp; Bookings Calendar</h2>
          </div>
          <p className="text-xs text-gray-500">
            Easily track your completed jobs, active bookings, and upcoming schedule availability.
          </p>
        </div>

        {/* Live Clock with Seconds widget */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#0B3B68] to-[#154875] text-white px-4 py-3 rounded-2xl shadow-sm self-start lg:self-auto">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black tracking-wider font-mono">
                {timeString}
              </span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[11px] text-blue-100/90 font-medium">
              {dateString}
            </p>
          </div>
        </div>
      </div>

      {/* Calendar Navigation & Month Controller */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-gray-900 min-w-[160px]">
            {monthName}
          </h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleTodayJump}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-[#0B3B68] bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            Today
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span>Completed</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>In Progress</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>Accepted</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>Pending Request</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200 border border-gray-300 inline-block" />
            <span className="text-gray-400">Available (Upcoming)</span>
          </span>
        </div>
      </div>

      {/* 2-Column Responsive Layout: Calendar Grid (Left) + Selected Date Agenda (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Calendar Grid */}
        <div className="lg:col-span-8 bg-gray-50/50 rounded-2xl border border-gray-100 p-4 sm:p-5">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((cell) => {
              const dayBookings = requestsByDate.get(cell.dateStr) || [];
              const isSelected = cell.dateStr === selectedDateStr;
              const isPast = cell.dateStr < todayStr;
              const isToday = cell.dateStr === todayStr;
              const isFuture = cell.dateStr > todayStr;

              const completedCount = dayBookings.filter(
                (b) => ['completed', 'done'].includes(String(b.status || b.rawStatus).toLowerCase())
              ).length;
              const pendingCount = dayBookings.filter(
                (b) => String(b.status || b.rawStatus).toLowerCase() === 'pending'
              ).length;
              const acceptedCount = dayBookings.filter(
                (b) => ['accepted', 'ongoing'].includes(String(b.status || b.rawStatus).toLowerCase())
              ).length;
              const inProgressCount = dayBookings.filter(
                (b) => String(b.status || b.rawStatus).toLowerCase() === 'in progress'
              ).length;

              const hasFutureBookings = pendingCount > 0 || acceptedCount > 0 || inProgressCount > 0;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  className={`min-h-[58px] sm:min-h-[76px] lg:min-h-[82px] p-1.5 sm:p-2 rounded-xl flex flex-col justify-between text-left transition-all border cursor-pointer ${
                    isSelected
                      ? 'border-[#0B3B68] bg-blue-50/70 shadow-xs ring-2 ring-[#0B3B68]/20'
                      : cell.isToday
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : cell.isCurrentMonth
                      ? 'border-gray-200/80 bg-white hover:border-blue-200 hover:bg-blue-50/20'
                      : 'border-transparent bg-gray-100/40 text-gray-300 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-bold leading-none ${
                        cell.isToday
                          ? 'w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black'
                          : isSelected
                          ? 'text-[#0B3B68] font-black'
                          : cell.isCurrentMonth
                          ? 'text-gray-800'
                          : 'text-gray-400'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {cell.isToday && (
                      <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-tight">Today</span>
                    )}
                  </div>

                  {/* Booking Badges / Dots */}
                  <div className="space-y-1 w-full mt-1">
                    {/* Previous days: ONLY show completed bookings */}
                    {isPast && completedCount > 0 && (
                      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 truncate flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                        <span>{completedCount} Done</span>
                      </div>
                    )}

                    {/* Present day: show completed, in-progress, accepted, pending - NEVER mark Available */}
                    {isToday && (
                      <>
                        {completedCount > 0 && (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 truncate flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                            <span>{completedCount} Done</span>
                          </div>
                        )}
                        {inProgressCount > 0 && (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                            <span>{inProgressCount} Active</span>
                          </div>
                        )}
                        {acceptedCount > 0 && (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                            <span>{acceptedCount} Booked</span>
                          </div>
                        )}
                        {pendingCount > 0 && (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{pendingCount} Req</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Future days: show active/booked/pending, and mark Available only if within 90 days and no bookings */}
                    {isFuture && (
                      <>
                        {inProgressCount > 0 && (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                            <span>{inProgressCount} Active</span>
                          </div>
                        )}
                        {acceptedCount > 0 && (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                            <span>{acceptedCount} Booked</span>
                          </div>
                        )}
                        {pendingCount > 0 && (
                          <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{pendingCount} Req</span>
                          </div>
                        )}
                        {cell.dateStr > maxDateStr ? (
                          <div className="text-[9px] text-gray-400 font-medium px-1 truncate flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                            <span>Locked</span>
                          </div>
                        ) : (
                          !hasFutureBookings && cell.isCurrentMonth && (
                            <div className="text-[9px] text-gray-400 font-medium px-1 truncate flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                              <span>Available</span>
                            </div>
                          )
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Date Agenda Details */}
        <div className="lg:col-span-4 bg-gray-50/60 rounded-2xl border border-gray-100 p-5 flex flex-col h-full min-h-[380px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Selected Schedule
              </span>
              <h4 className="text-sm font-bold text-gray-900 mt-0.5">
                {selectedDateFormatted}
              </h4>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white border border-gray-200 text-gray-700 shadow-2xs">
              {selectedDateBookings.length} {selectedDateBookings.length === 1 ? 'Booking' : 'Bookings'}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 py-3 custom-scrollbar max-h-[360px]">
            {selectedDateBookings.length > 0 ? (
              selectedDateBookings.map((b) => {
                const statusStr = String(b.status || b.rawStatus || 'Pending').toLowerCase();
                const isCompleted = ['completed', 'done'].includes(statusStr);
                const isPending = statusStr === 'pending';
                const isAccepted = statusStr === 'accepted' || statusStr === 'ongoing';
                const isInProgress = statusStr === 'in progress';

                const badgeBg = isCompleted
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : isPending
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : isAccepted
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : isInProgress
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-gray-50 text-gray-700 border-gray-200';

                return (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl bg-white border border-gray-200/80 shadow-2xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-gray-900 truncate">
                        {b.name || 'Homeowner'}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center gap-1 ${badgeBg}`}>
                        {isCompleted && <CheckCircle2 className="w-2.5 h-2.5 text-purple-600" />}
                        <span>{isCompleted ? 'Completed' : b.status || 'Pending'}</span>
                      </span>
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-600 mb-2">
                      <p className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-semibold text-gray-800">{b.needs || 'General Repair'}</span>
                      </p>
                      {b.preferredTime && (
                        <p className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span>Time: {b.preferredTime}</span>
                        </p>
                      )}
                      {b.location && (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{b.location}</span>
                        </p>
                      )}
                    </div>

                    {onViewDetails && (
                      <button
                        type="button"
                        onClick={() => onViewDetails(b)}
                        className="w-full mt-1 py-1.5 rounded-lg bg-gray-50 hover:bg-[#0B3B68] hover:text-white border border-gray-200 text-xs font-bold text-[#0B3B68] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            ) : isSelectedDatePast ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mb-3">
                  <Clock className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-600">Past Date</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                  No completed jobs recorded on this date.
                </p>
              </div>
            ) : isSelectedDateToday ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#004A8C] flex items-center justify-center mb-3">
                  <CalendarIcon className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-700">Today's Schedule</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                  No active or completed jobs scheduled for today.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-700">Available Schedule</p>
                <p className="text-[11px] text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                  No bookings scheduled for this date. You are open for new homeowner requests!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

