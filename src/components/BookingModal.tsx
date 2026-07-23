import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, Clock, User, Phone, Mail, DollarSign, Home, UserCheck, MessageSquare, Send } from 'lucide-react';
import { Property, Staff, Booking, Role } from '../types';
import { format } from 'date-fns';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBooking: (booking: Partial<Booking>) => Promise<void>;
  properties: Property[];
  staffList: Staff[];
  activeRole: Role;
  activeStaff: Staff | null;
  initialDate?: string;
  initialPropertyId?: string;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  onSaveBooking,
  properties,
  staffList,
  activeRole,
  activeStaff,
  initialDate,
  initialPropertyId
}) => {
  const visibleProperties = (activeRole === 'super_admin' || activeRole === 'owner')
    ? properties
    : properties.filter(p => activeStaff?.assignedPropertyIds.includes(p.id));

  const [propertyId, setPropertyId] = useState<string>(initialPropertyId || visibleProperties[0]?.id || '');
  const [bookingDate, setBookingDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(initialDate || format(new Date(), 'yyyy-MM-dd'));
  const [checkinTime, setCheckinTime] = useState<string>('15:00');
  const [checkoutTime, setCheckoutTime] = useState<string>('12:00');
  const [guestName, setGuestName] = useState<string>('');
  const [guestPhone, setGuestPhone] = useState<string>('');
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [paxCount, setPaxCount] = useState<number>(8);
  const [amount, setAmount] = useState<number>(1200);
  const [depositAmount, setDepositAmount] = useState<number>(200);
  const [depositPaid, setDepositPaid] = useState<boolean>(true);
  const [channel, setChannel] = useState<string>('Direct');
  const [assignedStaffId, setAssignedStaffId] = useState<string>(staffList[0]?.id || '');
  const [status, setStatus] = useState<'confirmed' | 'pending' | 'cancelled'>('confirmed');
  const [remarks, setRemarks] = useState<string>('');
  const [additionalRemarks, setAdditionalRemarks] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setBookingDate(initialDate);
        setEndDate(initialDate);
      } else {
        setBookingDate(format(new Date(), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
      }
      setPropertyId(initialPropertyId || visibleProperties[0]?.id || '');
    }
  }, [isOpen, initialDate, initialPropertyId, visibleProperties]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const selectedProp = properties.find(p => p.id === propertyId);
    const selectedStaff = staffList.find(s => s.id === assignedStaffId);

    try {
      await onSaveBooking({
        propertyId,
        propertyName: selectedProp?.name || 'PD Villa',
        bookingDate,
        endDate,
        checkinTime,
        checkoutTime,
        guestName,
        guestPhone,
        guestEmail,
        paxCount: Number(paxCount),
        amount: Number(amount),
        depositAmount: Number(depositAmount),
        depositPaid,
        channel,
        assignedStaffId,
        assignedStaffName: selectedStaff?.name || 'Staff',
        status,
        remarks,
        additionalRemarks,
        createdAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      console.error('Error saving booking:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5 text-blue-200" />
            <h2 className="text-base font-bold">New Homestay Booking</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Property Selection */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Select Homestay Property *</label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {visibleProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Dates & Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Check-in Date *</label>
              <input
                type="date"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                required
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Check-out Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Check-in Time</label>
              <input
                type="time"
                value={checkinTime}
                onChange={(e) => setCheckinTime(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Check-out Time</label>
              <input
                type="time"
                value={checkoutTime}
                onChange={(e) => setCheckoutTime(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Guest Information & Pax */}
          <div className="border-t border-gray-100 pt-3">
            <h3 className="font-bold text-gray-800 text-xs mb-2 flex items-center space-x-1">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Guest Details & Capacity</span>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-gray-600 mb-1">Guest Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tan Sri Jeffrey"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-600 mb-1">Phone Number (WhatsApp)</label>
                <input
                  type="tel"
                  placeholder="e.g. +60129991122"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-600 mb-1">Number of Pax (Guests)</label>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 8"
                  value={paxCount}
                  onChange={(e) => setPaxCount(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-purple-700"
                />
              </div>
            </div>
          </div>

          {/* Amount, Deposit, Channel & Staff Assignment */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Total Rental (RM)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-blue-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Deposit Amount (RM)</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(Number(e.target.value))}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-bold text-amber-700"
              />
            </div>

            <div className="flex flex-col justify-end pb-2">
              <label className="flex items-center space-x-2 cursor-pointer p-2.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={depositPaid}
                  onChange={(e) => setDepositPaid(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <span className="font-bold text-gray-800 text-xs">Deposit Paid</span>
              </label>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Booking Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
              >
                <option value="Direct">Direct</option>
                <option value="WhatsApp">WhatsApp</option>
                <option value="Airbnb">Airbnb</option>
                <option value="Agoda">Agoda</option>
                <option value="Booking.com">Booking.com</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Assigned Manager *</label>
            <select
              value={assignedStaffId}
              onChange={(e) => setAssignedStaffId(e.target.value)}
              required
              className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.phone}) — {s.assignedPropertyIds.length} properties
                </option>
              ))}
            </select>
          </div>

          {/* Remarks & Additional Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Remarks & Special Requests</label>
              <textarea
                rows={2}
                placeholder="e.g. Needs BBQ set, extra pool towels prepared."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1">Additional Remarks</label>
              <textarea
                rows={2}
                placeholder="e.g. Early check-in requested, deposit payment receipt verified."
                value={additionalRemarks}
                onChange={(e) => setAdditionalRemarks(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-medium"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md flex items-center space-x-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSaving ? 'SAVING...' : 'SUBMIT'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
