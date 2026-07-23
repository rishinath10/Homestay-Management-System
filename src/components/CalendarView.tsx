import React, { useState } from 'react';
import { Booking, Property, CalendarViewMode, Role } from '../types';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  subDays,
  parseISO,
  getDay,
  differenceInDays
} from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Building2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface CalendarViewProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  bookings: Booking[];
  properties: Property[];
  selectedPropertyIds: string[];
  onSelectBooking: (booking: Booking) => void;
  onCreateBookingAtDate: (dateStr: string, propertyId?: string) => void;
  activeRole: Role;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  currentDate,
  viewMode,
  bookings,
  properties,
  selectedPropertyIds,
  onSelectBooking,
  onCreateBookingAtDate,
  activeRole
}) => {
  // Selected date state for inspecting daily bookings (defaults to currentDate)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(currentDate, 'yyyy-MM-dd'));

  // Update selectedDateStr when currentDate changes
  React.useEffect(() => {
    setSelectedDateStr(format(currentDate, 'yyyy-MM-dd'));
  }, [currentDate]);

  // Filter bookings by selected properties
  const filteredBookings = bookings.filter((b) => selectedPropertyIds.includes(b.propertyId));

  // Helper map for fast property lookups
  const propertyMap = React.useMemo(() => {
    const map = new Map<string, Property>();
    properties.forEach((p) => map.set(p.id, p));
    return map;
  }, [properties]);

  // Bookings on selectedDateStr
  const selectedDateBookings = React.useMemo(() => {
    return filteredBookings.filter((b) => {
      if (b.bookingDate === selectedDateStr) return true;
      if (b.endDate) {
        return selectedDateStr >= b.bookingDate && selectedDateStr <= b.endDate;
      }
      return false;
    });
  }, [filteredBookings, selectedDateStr]);

  // Handle Month View
  if (viewMode === 'month') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Chunk calendarDays into weeks (arrays of 7 days)
    const weeks: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }

    return (
      <div className="flex-1 bg-gray-50 p-2 md:p-4 flex flex-col h-full select-none relative overflow-hidden">
        {/* Card wrapper */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          {/* Horizontal scroll wrapper for small mobile viewports */}
          <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col no-scrollbar">
            <div className="min-w-[768px] sm:min-w-0 flex-1 flex flex-col">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-white text-xs font-bold text-gray-500 text-center py-2.5 shadow-2xs sticky top-0 z-20">
              <span>SUN</span>
              <span>MON</span>
              <span>TUE</span>
              <span>WED</span>
              <span>THU</span>
              <span>FRI</span>
              <span>SAT</span>
            </div>

            {/* Month Grid grouped by Week Rows */}
            <div 
              className="flex-1 grid gap-[1px] bg-gray-200 border-b border-gray-200 overflow-hidden"
              style={{ gridTemplateRows: `repeat(${weeks.length}, minmax(0, 1fr))` }}
            >
          {weeks.map((week, weekIdx) => {
            const weekStartStr = format(week[0], 'yyyy-MM-dd');
            const weekEndStr = format(week[6], 'yyyy-MM-dd');

            // Find all bookings overlapping this week
            const weekBookings = filteredBookings.filter((b) => {
              const bStart = b.bookingDate;
              const bEnd = b.endDate || b.bookingDate;
              return bStart <= weekEndStr && bEnd >= weekStartStr;
            }).sort((a, b) => a.propertyId.localeCompare(b.propertyId) || a.bookingDate.localeCompare(b.bookingDate));

            return (
              <div key={weekIdx} className="relative bg-gray-200 h-full overflow-hidden">
                {/* Day Cell Backgrounds (7 columns) */}
                <div className="grid grid-cols-7 gap-[1px] h-full">
                  {week.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());
                    const isSelectedDay = selectedDateStr === dateStr;

                    // Bookings active on this day
                    const dayBookings = filteredBookings.filter((b) => {
                      if (b.bookingDate === dateStr) return true;
                      if (b.endDate) {
                        return dateStr >= b.bookingDate && dateStr <= b.endDate;
                      }
                      return false;
                    });

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          setSelectedDateStr(dateStr);
                          if (activeRole !== 'staff') {
                            onCreateBookingAtDate(dateStr);
                          }
                        }}
                        className={`p-2 flex flex-col justify-between transition-all group cursor-pointer h-full ${
                          isSelectedDay
                            ? 'bg-blue-50/90 ring-2 ring-blue-500 z-10'
                            : !isCurrentMonth
                            ? 'bg-gray-100/60 text-gray-400'
                            : 'bg-white hover:bg-blue-50/30'
                        }`}
                      >
                        {/* Day Cell Header */}
                        <div className="absolute top-1.5 left-1.5 flex items-center space-x-1 z-20">
                          <span
                            className={`text-[10px] font-extrabold h-5 w-5 rounded-full flex items-center justify-center ${
                              isToday
                                ? 'bg-blue-600 text-white shadow-xs'
                                : isSelectedDay
                                ? 'bg-blue-100 text-blue-900 font-black'
                                : isCurrentMonth
                                ? 'text-gray-800'
                                : 'text-gray-400'
                            }`}
                          >
                            {format(day, 'd')}
                          </span>

                          {dayBookings.length > 1 && (
                            <span className="px-1 py-0.2 bg-purple-50/80 text-purple-700 border border-purple-100 font-extrabold text-[9px] rounded-full flex items-center shrink-0">
                              <span>{dayBookings.length}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Overlaid Continuous Booking Bars Layer (7 columns) */}
                <div className="absolute top-7 left-0 right-0 bottom-0.5 px-1 pointer-events-none z-10 grid grid-cols-7 gap-x-[1px] gap-y-0.5 overflow-hidden">
                  {weekBookings.map((booking) => {
                    const prop = propertyMap.get(booking.propertyId);
                    const color = prop?.color || '#1a73e8';

                    const bStart = booking.bookingDate;
                    const bEnd = booking.endDate || booking.bookingDate;

                    let startCol = 1;
                    if (bStart >= weekStartStr) {
                      startCol = getDay(parseISO(bStart)) + 1;
                    }

                    let endCol = 8;
                    if (bEnd <= weekEndStr) {
                      if (bEnd === bStart) {
                        endCol = startCol + 1;
                      } else {
                        const endDayIdx = getDay(parseISO(bEnd));
                        endCol = Math.max(startCol + 1, endDayIdx + 1);
                      }
                    }

                    const isStartInWeek = bStart >= weekStartStr;
                    const isEndInWeek = bEnd <= weekEndStr;
                    const isMultiDay = bEnd > bStart;

                    let nights = 1;
                    if (isMultiDay) {
                      nights = differenceInDays(parseISO(bEnd), parseISO(bStart));
                    }

                    return (
                      <div
                        key={booking.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDateStr(bStart >= weekStartStr ? bStart : weekStartStr);
                          onSelectBooking(booking);
                        }}
                        style={{
                          gridColumnStart: startCol,
                          gridColumnEnd: endCol,
                          backgroundColor: color,
                        }}
                        className={`pointer-events-auto h-4 px-1 text-[8.5px] text-white shadow-2xs flex items-center justify-between font-bold cursor-pointer hover:opacity-95 transition-all truncate leading-none ${
                          isStartInWeek ? 'rounded-md' : 'rounded-l-none border-l-2 border-white/40'
                        } ${
                          isEndInWeek ? 'rounded-md' : 'rounded-r-none border-r-2 border-white/40'
                        }`}
                      >
                        <div className="flex items-center space-x-1 truncate leading-none">
                          {!isStartInWeek && (
                            <span className="text-[9px] opacity-80 font-mono">‹</span>
                          )}
                          <span className="font-extrabold truncate">
                            {prop?.code || booking.propertyName || 'Villa'}
                          </span>
                          <span className="opacity-90 font-medium truncate">
                            • {booking.guestName || 'Guest'}
                          </span>
                        </div>

                        <div className="flex items-center space-x-0.5 shrink-0 ml-1 leading-none">
                          {isMultiDay && isStartInWeek && (
                            <span className="text-[7.5px] bg-black/25 px-1 rounded font-mono font-bold shrink-0">
                              {nights}N
                            </span>
                          )}
                          <span className="text-[7.5px] bg-black/25 px-1 rounded font-medium">
                            {booking.channel || 'Direct'}
                          </span>
                          {!isEndInWeek && (
                            <span className="text-[9px] opacity-80 font-mono">›</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
          </div>
        </div>

        {/* Floating / Sliding Date Overview Bar when a date is selected */}
        {selectedDateStr && (
          <div className="bg-white border-t border-gray-200 px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-lg z-20">
            <div className="flex items-center justify-between sm:justify-start space-x-3">
              <span className="text-xs font-bold text-gray-900">
                Selected: {format(parseISO(selectedDateStr), 'EEE, MMM d')}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[11px] font-bold rounded-full">
                {selectedDateBookings.length} {selectedDateBookings.length === 1 ? 'Booking' : 'Bookings'}
              </span>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {selectedDateBookings.map((b) => {
                const prop = propertyMap.get(b.propertyId);
                return (
                  <button
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="px-2.5 py-1 text-white text-xs font-semibold rounded-lg shadow-2xs hover:opacity-90 transition-opacity flex items-center space-x-1.5 shrink-0"
                    style={{ backgroundColor: prop?.color || '#1a73e8' }}
                  >
                    <span>{prop?.code || 'Villa'}:</span>
                    <span>{b.guestName || 'Guest'}</span>
                  </button>
                );
              })}

              {activeRole !== 'staff' && (
                <button
                  onClick={() => onCreateBookingAtDate(selectedDateStr)}
                  className="px-3 py-1 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors flex items-center space-x-1 shrink-0 ml-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Booking</span>
                </button>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    );
  }

  // Handle Dedicated Day View (Multi-Villa Single Date Grid)
  if (viewMode === 'day') {
    const activeDateObj = parseISO(selectedDateStr);

    return (
      <div className="flex-1 bg-gray-50 p-4 md:p-6 lg:p-8 flex flex-col h-full overflow-y-auto space-y-6">
        {/* Date Selector Header */}
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                const prevDate = subDays(activeDateObj, 1);
                setSelectedDateStr(format(prevDate, 'yyyy-MM-dd'));
              }}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors"
              title="Previous Day"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest">Single-Day Multi-Villa View</span>
              <h2 className="text-xl font-extrabold text-gray-900">
                {format(activeDateObj, 'EEEE, MMMM d, yyyy')}
              </h2>
            </div>

            <button
              onClick={() => {
                const nextDate = addDays(activeDateObj, 1);
                setSelectedDateStr(format(nextDate, 'yyyy-MM-dd'));
              }}
              className="p-2 border border-gray-200 rounded-xl hover:bg-gray-100 text-gray-700 transition-colors"
              title="Next Day"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full border border-purple-100">
              {selectedDateBookings.length} Active Reservations
            </span>
            {activeRole !== 'staff' && (
              <button
                onClick={() => onCreateBookingAtDate(selectedDateStr)}
                className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-blue-700 transition-colors flex items-center space-x-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Booking</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Villa Detailed Day Cards */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
            All 5 Port Dickson Villas Status for {selectedDateStr}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties
              .filter((p) => selectedPropertyIds.includes(p.id))
              .map((prop) => {
                const booking = selectedDateBookings.find((b) => b.propertyId === prop.id);
                const isBooked = !!booking;
                const assignedStaff = prop.id === 'prop-1' || prop.id === 'prop-2' ? 'Sue' : 'Yati';

                return (
                  <div
                    key={prop.id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs flex flex-col justify-between ${
                      isBooked ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200 opacity-90'
                    }`}
                  >
                    {/* Villa Top Banner */}
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between" style={{ borderLeftWidth: '6px', borderLeftColor: prop.color }}>
                      <div>
                        <span className="text-[10px] font-mono font-bold text-gray-400">{prop.code}</span>
                        <h4 className="text-base font-extrabold text-gray-900">{prop.name}</h4>
                        <p className="text-[11px] text-gray-500">Manager: <span className="font-bold text-gray-700">{assignedStaff}</span></p>
                      </div>

                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        isBooked ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isBooked ? 'Occupied' : 'Available'}
                      </span>
                    </div>

                    {/* Booking Details or Available Button */}
                    <div className="p-4 flex-1">
                      {isBooked && booking ? (
                        <div
                          onClick={() => onSelectBooking(booking)}
                          className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-2 cursor-pointer hover:bg-blue-50/50 transition-colors"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-900 flex items-center space-x-1">
                              <User className="w-3.5 h-3.5 text-blue-600" />
                              <span>{booking.guestName || 'Guest'}</span>
                            </span>
                            <span className="px-2 py-0.5 bg-black/10 text-gray-800 text-[10px] font-bold rounded-full">
                              {booking.channel || 'Direct'}
                            </span>
                          </div>

                          <div className="text-xs text-gray-600 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <span>{booking.guestPhone || 'No Phone'}</span>
                              </span>
                              <span className="font-bold text-purple-800 text-[11px]">👥 {booking.paxCount || prop?.maxGuests || 8} Pax</span>
                            </div>

                            <p className="flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span>{booking.checkinTime} - {booking.checkoutTime || '12:00'}</span>
                            </p>

                            <div className={`text-[11px] font-bold p-1.5 rounded-lg flex items-center justify-between ${
                              booking.depositPaid
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-amber-50 text-amber-900 border border-amber-200'
                            }`}>
                              <span>Deposit: RM {booking.depositAmount || 0}</span>
                              <span>{booking.depositPaid ? 'Paid ✓' : 'Unpaid ✗'}</span>
                            </div>

                            {booking.remarks && (
                              <p className="text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg font-mono border border-amber-200">
                                <strong>Remarks:</strong> {booking.remarks}
                              </p>
                            )}

                            {booking.additionalRemarks && (
                              <p className="text-[11px] text-indigo-950 bg-indigo-50/80 p-2 rounded-lg font-mono border border-indigo-100">
                                <strong>Add. Note:</strong> {booking.additionalRemarks}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-xs font-bold">
                            <span className="text-gray-500">Total Rate:</span>
                            <span className="text-blue-600">RM {booking.amount || 0}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl space-y-2">
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 opacity-60" />
                          <p className="text-xs font-medium text-gray-600">Villa is free for {selectedDateStr}</p>
                          {activeRole !== 'staff' && (
                            <button
                              onClick={() => onCreateBookingAtDate(selectedDateStr, prop.id)}
                              className="mt-1 px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                            >
                              + Book {prop.name}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    );
  }

  // Handle Week View
  if (viewMode === 'week') {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = endOfWeek(currentDate);
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return (
      <div className="flex-1 bg-gray-50 p-4 md:p-6 lg:p-8 flex flex-col h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto w-full space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="border-b border-gray-200 pb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">
                Weekly Multi-Villa Schedule ({format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')})
              </h2>
              <span className="text-xs text-gray-500">7-Day Multi-Booking View</span>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {weekDays.map((d) => {
              const dateStr = format(d, 'yyyy-MM-dd');
              const isToday = isSameDay(d, new Date());
              const dayBookings = filteredBookings.filter((b) => b.bookingDate === dateStr || (b.endDate && dateStr >= b.bookingDate && dateStr <= b.endDate));

              return (
                <div
                  key={d.toISOString()}
                  onClick={() => {
                    if (activeRole !== 'staff') {
                      onCreateBookingAtDate(dateStr);
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all space-y-2 min-h-[180px] ${
                    isToday ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-gray-50/50 hover:bg-gray-100/50'
                  } ${activeRole === 'staff' ? 'cursor-default' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between border-b border-gray-200 pb-1.5">
                    <span className="text-xs font-extrabold text-gray-800">{format(d, 'EEE')}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                      {format(d, 'd MMM')}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayBookings.map((b) => {
                      const prop = propertyMap.get(b.propertyId);
                      const color = prop?.color || '#1a73e8';

                      return (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectBooking(b);
                          }}
                          className="p-2 rounded-xl text-white text-[10px] font-semibold shadow-2xs space-y-0.5 hover:brightness-95 transition-all"
                          style={{ backgroundColor: color }}
                        >
                          <p className="font-bold truncate">{prop?.name || b.propertyName}</p>
                          <p className="opacity-90">{b.guestName || 'Guest'}</p>
                          <p className="opacity-80 text-[9px]">{b.checkinTime} • {b.channel || 'Direct'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
     </div>
    );
  }

  // Handle Property Grid / Timeline View
  if (viewMode === 'property_grid') {
    const days = Array.from({ length: 14 }).map((_, i) => addDays(currentDate, i));

    return (
      <div className="flex-1 bg-gray-50 p-4 md:p-6 lg:p-8 flex flex-col h-full overflow-hidden">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200 flex items-center justify-between text-xs text-gray-700">
            <span className="font-bold text-gray-800">Homestay Property Timeline Matrix (14 Days)</span>
            <span className="text-gray-500">View all villa bookings side-by-side</span>
          </div>

          <div className="flex-1 overflow-auto no-scrollbar">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-200 sticky top-0 z-10">
                <th className="p-3 text-left font-semibold text-gray-700 w-56 min-w-[220px] bg-gray-100 border-r border-gray-200">
                  Property Name (PD Villa)
                </th>
                {days.map((d) => (
                  <th key={d.toISOString()} className="p-2 text-center font-medium text-gray-700 min-w-[90px] border-r border-gray-200">
                    <div className="font-bold">{format(d, 'EEE')}</div>
                    <div className="text-[11px] text-gray-500">{format(d, 'MMM d')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {properties
                .filter((p) => selectedPropertyIds.includes(p.id))
                .map((prop) => {
                  return (
                    <tr key={prop.id} className="border-b border-gray-200 hover:bg-gray-50/50">
                      <td className="p-3 border-r border-gray-200 bg-white sticky left-0 z-10">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: prop.color }} />
                          <div>
                            <p className="font-semibold text-gray-900 truncate max-w-[170px]">{prop.name}</p>
                            <p className="text-[10px] text-gray-500">{prop.code} • Max {prop.maxGuests} guests</p>
                          </div>
                        </div>
                      </td>

                      {days.map((d) => {
                        const dateStr = format(d, 'yyyy-MM-dd');
                        const booking = bookings.find((b) => b.propertyId === prop.id && (b.bookingDate === dateStr || (b.endDate && dateStr >= b.bookingDate && dateStr <= b.endDate)));

                        const isStart = booking && dateStr === booking.bookingDate;
                        const isEnd = booking && dateStr === (booking.endDate || booking.bookingDate);
                        const isMultiDay = booking && !!booking.endDate && booking.endDate > booking.bookingDate;

                        const connectsLeft = isMultiDay && !isStart;
                        const connectsRight = isMultiDay && !isEnd;

                        let shapeClass = 'rounded-lg mx-0';
                        if (connectsLeft && connectsRight) {
                          shapeClass = 'rounded-none -mx-2.5 z-10 relative border-r border-white/30';
                        } else if (!connectsLeft && connectsRight) {
                          shapeClass = 'rounded-l-lg rounded-r-none -mr-2.5 z-10 relative border-r border-white/30';
                        } else if (connectsLeft && !connectsRight) {
                          shapeClass = 'rounded-r-lg rounded-l-none -ml-2.5 z-10 relative';
                        }

                        return (
                          <td
                            key={dateStr}
                            onClick={() => {
                              if (booking) {
                                onSelectBooking(booking);
                              } else if (activeRole !== 'staff') {
                                onCreateBookingAtDate(dateStr, prop.id);
                              }
                            }}
                            className={`p-1 border-r border-gray-100 text-center transition-colors ${
                              booking || activeRole === 'staff' ? 'cursor-default' : 'cursor-pointer hover:bg-blue-50/50'
                            }`}
                          >
                            {booking ? (
                              <div
                                className={`p-1.5 text-white font-semibold text-[11px] shadow-xs hover:scale-[1.01] transition-transform truncate ${shapeClass}`}
                                style={{ backgroundColor: prop.color }}
                              >
                                {!connectsLeft && connectsRight ? (
                                  <>
                                    <p className="truncate text-left text-[10px] font-bold">{booking.guestName || 'Booked'} ➔</p>
                                    <p className="text-[9px] opacity-90 text-left truncate">{booking.channel || 'Direct'}</p>
                                  </>
                                ) : connectsLeft && connectsRight ? (
                                  <>
                                    <p className="truncate text-center text-[10px] font-bold">↳ {booking.guestName || 'Stay'}</p>
                                  </>
                                ) : connectsLeft && !connectsRight ? (
                                  <>
                                    <p className="truncate text-left text-[10px] font-bold">➔ {booking.guestName || 'Check-out'}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="truncate text-left text-[10px] font-bold">{booking.guestName || 'Booked'}</p>
                                    <p className="text-[9px] opacity-90 text-left truncate">{booking.channel || 'Direct'}</p>
                                  </>
                                )}
                              </div>
                            ) : activeRole !== 'staff' ? (
                              <div className="h-10 rounded-lg border border-dashed border-gray-200 hover:border-blue-300 flex items-center justify-center text-gray-300 hover:text-blue-500 transition-colors">
                                <Plus className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <div className="h-10 rounded-lg bg-gray-50 border border-gray-100" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
     </div>
    );
  }

  // Handle Agenda View
  if (viewMode === 'agenda') {
    const sortedBookings = [...filteredBookings].sort((a, b) => a.bookingDate.localeCompare(b.bookingDate));

    return (
      <div className="flex-1 bg-gray-50 p-4 md:p-6 lg:p-8 flex flex-col h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Upcoming Bookings Agenda</h2>
              <p className="text-xs text-gray-500">Chronological check-in list for assigned homestays</p>
            </div>
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
              {sortedBookings.length} Bookings Found
            </span>
          </div>

          {sortedBookings.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
              <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-700">No upcoming bookings for selected properties</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedBookings.map((b) => {
                const prop = propertyMap.get(b.propertyId);
                const color = prop?.color || '#1a73e8';

                return (
                  <div
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className="p-4 rounded-2xl border border-gray-200 hover:border-blue-400 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className="w-3.5 h-3.5 rounded-full mt-1 shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-gray-900 text-sm">{b.propertyName || prop?.name}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              b.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : b.status === 'pending'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 font-medium mt-0.5">
                          📅 {b.bookingDate} {b.endDate ? `to ${b.endDate}` : ''} | 🕒 Check-in: {b.checkinTime}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{b.guestName || 'Guest'}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{b.guestPhone || 'No contact'}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right border-t md:border-t-0 pt-2 md:pt-0 border-gray-100">
                      <p className="text-base font-bold text-blue-600">RM {b.amount || 0}</p>
                      <p className="text-[10px] text-gray-400">Assigned: {b.assignedStaffName || 'Staff Member'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
