import React from 'react';
import { X, Calendar as CalendarIcon, Clock, User, Phone, MapPin, Trash2, SendHorizontal, Bot, Mail, CheckCircle } from 'lucide-react';
import { Booking, Property, Staff, Role } from '../types';

interface BookingDetailModalProps {
  booking: Booking | null;
  property?: Property;
  staff?: Staff;
  onClose: () => void;
  onDeleteBooking: (id: string) => Promise<void>;
  onTriggerTelegramAlert: (booking: Booking, staff: Staff) => void;
  activeRole: Role;
}

export const BookingDetailModal: React.FC<BookingDetailModalProps> = ({
  booking,
  property,
  staff,
  onClose,
  onDeleteBooking,
  onTriggerTelegramAlert,
  activeRole
}) => {
  if (!booking) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-gray-100 animate-zoom-in">
        {/* Header with Property Color Banner */}
        <div 
          className="p-6 text-white relative"
          style={{ backgroundColor: property?.color || '#1a73e8' }}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider">
              {booking.status}
            </span>
            <span className="px-2.5 py-1 bg-black/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-wider">
              Channel: {booking.channel || 'Direct'}
            </span>
          </div>

          <h2 className="text-xl font-bold mt-2 leading-tight">
            {booking.propertyName || property?.name}
          </h2>
          <p className="text-xs text-white/80 mt-1 flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5" />
            <span>{property?.address || 'Port Dickson, Malaysia'}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs text-gray-700">
          {/* Dates & Times */}
          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Check-In Date</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">📅 {booking.bookingDate}</p>
              <p className="text-xs text-gray-600">🕒 {booking.checkinTime}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Check-Out Date</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">📅 {booking.endDate || 'Next Day'}</p>
              <p className="text-xs text-gray-600">🕒 {booking.checkoutTime || '12:00'}</p>
            </div>
          </div>

          {/* Guest Information & Pax */}
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-gray-500">
              Guest Information & Capacity
            </h3>
            <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  {booking.guestName ? booking.guestName.charAt(0) : 'G'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{booking.guestName || 'Guest'}</p>
                  <p className="text-[11px] text-gray-500">{booking.guestPhone || 'No contact provided'}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-extrabold text-blue-600 text-sm">RM {booking.amount || 0}</span>
                <p className="text-[10px] text-purple-700 font-bold mt-0.5">👥 Pax: {booking.paxCount || property?.maxGuests || 8} guests</p>
              </div>
            </div>
          </div>

          {/* Deposit Info Card */}
          <div className="p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200/80 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] font-bold uppercase text-amber-800">Security Deposit</p>
              <p className="text-sm font-extrabold text-amber-900 mt-0.5">RM {booking.depositAmount || 0}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center space-x-1 ${
              booking.depositPaid
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <CheckCircle className={`w-3.5 h-3.5 ${booking.depositPaid ? 'text-emerald-600' : 'text-red-500'}`} />
              <span>{booking.depositPaid ? 'Deposit Paid ✓' : 'Deposit Unpaid ✗'}</span>
            </span>
          </div>

          {/* Staff Assignment */}
          <div>
            <h3 className="font-bold text-gray-500 text-[10px] uppercase tracking-wider mb-1">
              Assigned Villa Manager
            </h3>
            <div className="flex items-center space-x-2 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
              <User className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-blue-900">{booking.assignedStaffName || staff?.name || 'Staff'}</span>
              <span className="text-gray-500 font-mono text-[11px]">({staff?.email || 'manager@pdholidayvillas.com'})</span>
            </div>
          </div>

          {/* Remarks */}
          {booking.remarks && (
            <div>
              <h3 className="font-bold text-gray-500 text-[10px] uppercase tracking-wider mb-1">Remarks & Special Requests</h3>
              <p className="p-2.5 bg-gray-50 text-gray-800 border border-gray-200 rounded-xl text-xs font-mono">
                {booking.remarks}
              </p>
            </div>
          )}

          {/* Additional Remarks */}
          {booking.additionalRemarks && (
            <div>
              <h3 className="font-bold text-gray-500 text-[10px] uppercase tracking-wider mb-1">Additional Remarks</h3>
              <p className="p-2.5 bg-indigo-50/60 text-indigo-950 border border-indigo-100 rounded-xl text-xs font-mono">
                {booking.additionalRemarks}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            {activeRole !== 'staff' ? (
              <>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel/delete this booking?')) {
                      onDeleteBooking(booking.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-xl font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Cancel Booking</span>
                </button>

                <button
                  onClick={() => {
                    if (staff) {
                      onTriggerTelegramAlert(booking, staff);
                    } else {
                      alert('No assigned staff found for this booking.');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center space-x-1.5 shadow-md transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  <span>Send Telegram & Email Alert</span>
                </button>
              </>
            ) : (
              <p className="text-gray-400 font-semibold italic text-center w-full py-1">
                Read-only access: Booking managed by admin/owner.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

