import React, { useState, useEffect } from 'react';
import { 
  db, 
  auth, 
  googleProvider, 
  seedInitialFirestoreData, 
  DEFAULT_PROPERTIES, 
  DEFAULT_STAFF,
  logActivity
} from './lib/firebase';
import { LoginScreen } from './components/LoginScreen';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';
import { Property, Staff, Booking, NotificationLog, Role, CalendarViewMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { PropertiesView } from './components/PropertiesView';
import { StaffMatrixView } from './components/StaffMatrixView';
import { NotificationLogsView } from './components/NotificationLogsView';
import { FlutterAppHubView } from './components/FlutterAppHubView';
import { ICalSyncView } from './components/ICalSyncView';
import { BookingModal } from './components/BookingModal';
import { BookingDetailModal } from './components/BookingDetailModal';
import { triggerTelegramAndEmailAlerts } from './lib/telegramEmail';
import { addMonths, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, Home, Users, Plus, RefreshCw, SendHorizontal } from 'lucide-react';

export default function App() {
  // User Session State
  const [sessionUser, setSessionUser] = useState<{ email: string; name: string; role: Role; staffObj: Staff | null } | null>(() => {
    const stored = localStorage.getItem('pd_session');
    return stored ? JSON.parse(stored) : null;
  });

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'calendar' | 'properties' | 'staff' | 'ical' | 'notifications' | 'flutter' | 'settings'>('calendar');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Firestore Data Collections
  const [properties, setProperties] = useState<Property[]>(DEFAULT_PROPERTIES);
  const [staffList, setStaffList] = useState<Staff[]>(DEFAULT_STAFF);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);

  // Derived Access Context from Session
  const activeRole = sessionUser?.role || 'staff';
  const activeStaff = sessionUser?.staffObj || null;
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(DEFAULT_PROPERTIES.map(p => p.id));

  const displayBookings = React.useMemo(() => {
    if (activeRole === 'super_admin' || activeRole === 'owner') {
      return bookings;
    }
    // Staff can only see bookings created by super_admin or owner
    return bookings.filter(b => b.createdByRole === 'super_admin' || b.createdByRole === 'owner');
  }, [bookings, activeRole]);

  // Network & Auth State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>('');
  const [modalInitialPropertyId, setModalInitialPropertyId] = useState<string>('');

  // 1. Initial Setup: Seed Firestore & Listeners
  useEffect(() => {
    seedInitialFirestoreData();

    // Online/Offline Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // Real-time Firestore Listeners
    const unsubProps = onSnapshot(collection(db, 'properties'), (snapshot) => {
      if (!snapshot.empty) {
        const propsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Property));
        setProperties(propsData);
      }
    });

    const unsubStaff = onSnapshot(collection(db, 'staff'), (snapshot) => {
      if (!snapshot.empty) {
        const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
        setStaffList(staffData);
      }
    });

    const unsubBookings = onSnapshot(collection(db, 'bookings'), (snapshot) => {
      const bookingsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(bookingsData);
    });

    const unsubLogs = onSnapshot(collection(db, 'notifications'), (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationLog));
      // Sort newest first
      logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotificationLogs(logsData);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeAuth();
      unsubProps();
      unsubStaff();
      unsubBookings();
      unsubLogs();
    };
  }, []);

  // Update filtered selected properties when role/staff changes
  useEffect(() => {
    if (activeRole === 'super_admin' || activeRole === 'owner') {
      setSelectedPropertyIds(properties.map(p => p.id));
    } else if (activeStaff) {
      setSelectedPropertyIds(activeStaff.assignedPropertyIds);
    }
  }, [activeRole, activeStaff, properties]);

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.warn('Google Auth popup fallback:', err);
    }
  };

  const handleLogout = async () => {
    if (sessionUser) {
      await logActivity(sessionUser.email, sessionUser.name, sessionUser.role, 'Logged Out');
    }
    localStorage.removeItem('pd_session');
    setSessionUser(null);
    await firebaseSignOut(auth);
  };

  // Date Navigation
  const handleNavigateDate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
    } else if (direction === 'prev') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (direction === 'next') {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  // Property Filter Handlers
  const handleTogglePropertyFilter = (propertyId: string) => {
    if (selectedPropertyIds.includes(propertyId)) {
      setSelectedPropertyIds(selectedPropertyIds.filter(id => id !== propertyId));
    } else {
      setSelectedPropertyIds([...selectedPropertyIds, propertyId]);
    }
  };

  const handleSelectAllProperties = () => {
    if (activeRole === 'super_admin' || activeRole === 'owner') {
      setSelectedPropertyIds(properties.map(p => p.id));
    } else if (activeStaff) {
      setSelectedPropertyIds(activeStaff.assignedPropertyIds);
    }
  };

  // Create & Save Booking Handler
  const handleSaveBooking = async (bookingData: Partial<Booking>) => {
    const bookingId = bookingData.id || `bk-${Date.now()}`;
    const newBooking: Booking = {
      id: bookingId,
      propertyId: bookingData.propertyId || properties[0].id,
      propertyName: bookingData.propertyName,
      bookingDate: bookingData.bookingDate || '',
      endDate: bookingData.endDate,
      checkinTime: bookingData.checkinTime || '15:00',
      checkoutTime: bookingData.checkoutTime || '12:00',
      guestName: bookingData.guestName,
      guestPhone: bookingData.guestPhone,
      guestEmail: bookingData.guestEmail,
      paxCount: bookingData.paxCount,
      depositAmount: bookingData.depositAmount,
      depositPaid: bookingData.depositPaid,
      remarks: bookingData.remarks,
      additionalRemarks: bookingData.additionalRemarks,
      assignedStaffId: bookingData.assignedStaffId,
      assignedStaffName: bookingData.assignedStaffName,
      status: bookingData.status || 'confirmed',
      amount: bookingData.amount,
      channel: bookingData.channel || 'Direct',
      createdAt: bookingData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: bookingData.createdBy || sessionUser?.email || 'admin@pdvillas.com',
      createdByRole: bookingData.createdByRole || activeRole
    };

    // Validate Booking Clash / Double Booking
    const hasClash = bookings.some(b => {
      if (b.id === bookingId) return false;
      if (b.propertyId !== newBooking.propertyId) return false;
      if (b.status === 'cancelled') return false;

      const bStart = b.bookingDate;
      const bEnd = b.endDate || b.bookingDate;
      const newStart = newBooking.bookingDate;
      const newEnd = newBooking.endDate || newBooking.bookingDate;

      return (newStart < bEnd && newEnd > bStart);
    });

    if (hasClash) {
      const clashingBooking = bookings.find(b => {
        if (b.id === bookingId) return false;
        if (b.propertyId !== newBooking.propertyId) return false;
        if (b.status === 'cancelled') return false;
        const bStart = b.bookingDate;
        const bEnd = b.endDate || b.bookingDate;
        const newStart = newBooking.bookingDate;
        const newEnd = newBooking.endDate || newBooking.bookingDate;
        return (newStart < bEnd && newEnd > bStart);
      });

      const clashMsg = `⚠️ DOUBLE BOOKING CLASH! This villa is already reserved from ${clashingBooking?.bookingDate} to ${clashingBooking?.endDate || clashingBooking?.bookingDate} by ${clashingBooking?.guestName || 'another guest'}.`;
      alert(clashMsg);

      // Create a warning notification in Firestore for host/admin alerts
      try {
        const notifId = `notif-${Date.now()}`;
        await setDoc(doc(db, 'notifications', notifId), {
          id: notifId,
          type: 'double_booking_blocked',
          title: 'Blocked Booking Clash Alert',
          message: `Double booking attempt blocked for property "${newBooking.propertyName || 'Villa'}" by user ${sessionUser?.email || 'unknown'}. Attempted Date Range: ${newBooking.bookingDate} to ${newBooking.endDate || newBooking.bookingDate}. Clashing Guest: ${clashingBooking?.guestName || 'Unknown'}.`,
          timestamp: new Date().toISOString(),
          status: 'unread',
          propertyId: newBooking.propertyId
        });
      } catch (e) {
        console.error('Failed to create clash notification:', e);
      }

      // Log Warning Activity
      await logActivity(
        sessionUser?.email || 'unknown',
        sessionUser?.name || 'Unknown',
        activeRole,
        'Booking Clash Attempt Blocked',
        `Attempted Booking Date Range: ${newBooking.bookingDate} to ${newBooking.endDate || newBooking.bookingDate} for Guest: ${newBooking.guestName} on property: ${newBooking.propertyName}`
      );

      throw new Error('Booking clash detected.');
    }

    // Save to Firestore
    await setDoc(doc(db, 'bookings', bookingId), newBooking);

    // Log Activity
    await logActivity(
      sessionUser?.email || 'unknown',
      sessionUser?.name || 'Unknown',
      activeRole,
      bookingData.id ? 'Updated Booking' : 'Created Booking',
      `Booking ID: ${bookingId}, Guest: ${newBooking.guestName}, Property: ${newBooking.propertyName}`
    );

    // Trigger Telegram + Email notification alert to assigned staff
    const assignedStaffObj = staffList.find(s => s.id === bookingData.assignedStaffId);
    if (assignedStaffObj) {
      await triggerTelegramAndEmailAlerts(newBooking, assignedStaffObj);
    }
  };

  // Delete Booking Handler
  const handleDeleteBooking = async (bookingId: string) => {
    const bookingToDelete = bookings.find(b => b.id === bookingId);
    await deleteDoc(doc(db, 'bookings', bookingId));

    // Log Activity
    await logActivity(
      sessionUser?.email || 'unknown',
      sessionUser?.name || 'Unknown',
      activeRole,
      'Deleted Booking',
      `Booking ID: ${bookingId}, Guest: ${bookingToDelete?.guestName || 'Unknown'}, Property: ${bookingToDelete?.propertyName || 'Unknown'}`
    );
  };

  // Update Staff Access Matrix
  const handleUpdateStaffPropertyAccess = async (staffId: string, propertyIds: string[]) => {
    const staffObj = staffList.find(s => s.id === staffId);
    await updateDoc(doc(db, 'staff', staffId), {
      assignedPropertyIds: propertyIds
    });

    // Log Activity
    await logActivity(
      sessionUser?.email || 'unknown',
      sessionUser?.name || 'Unknown',
      activeRole,
      'Updated Staff Property Access',
      `Staff Name: ${staffObj?.name || staffId}, Assigned Properties: ${propertyIds.join(', ')}`
    );
  };

  // Manual Telegram & Email Notification re-trigger
  const handleTriggerTelegramAlert = async (booking: Booking, staff: Staff) => {
    await triggerTelegramAndEmailAlerts(booking, staff);
    alert(`Telegram & Email alerts dispatched to ${staff.name} (${staff.email})!`);
  };

  if (!sessionUser) {
    return (
      <LoginScreen
        onLoginSuccess={async (user) => {
          localStorage.setItem('pd_session', JSON.stringify(user));
          setSessionUser(user);
          await logActivity(user.email, user.name, user.role, 'Logged In');
        }}
      />
    );
  }

  return (
    <div className="h-screen w-screen bg-gray-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header */}
      <Header
        currentDate={currentDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNavigateDate={handleNavigateDate}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        activeRole={activeRole}
        activeStaff={activeStaff}
        staffList={staffList}
        onSelectRoleContext={() => {}}
        isOnline={isOnline}
        userEmail={sessionUser.email}
        userName={sessionUser.name}
        userPhoto={null}
        onGoogleSignIn={handleGoogleSignIn}
        onSignOut={handleLogout}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsSidebarOpen(false);
          }}
          onCreateBookingClick={() => {
            setModalInitialDate('');
            setModalInitialPropertyId('');
            setIsBookingModalOpen(true);
            setIsSidebarOpen(false);
          }}
          properties={properties}
          selectedPropertyIds={selectedPropertyIds}
          onTogglePropertyFilter={handleTogglePropertyFilter}
          onSelectAllProperties={handleSelectAllProperties}
          currentDate={currentDate}
          onSelectDate={(d) => {
            setCurrentDate(d);
            setActiveTab('calendar');
            setIsSidebarOpen(false);
          }}
          activeRole={activeRole}
          activeStaff={activeStaff}
        />

        {/* Content Views */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 pb-16 md:pb-0">
          {activeTab === 'calendar' && (
            <CalendarView
              currentDate={currentDate}
              viewMode={viewMode}
              bookings={displayBookings}
              properties={properties}
              selectedPropertyIds={selectedPropertyIds}
              onSelectBooking={(b) => setSelectedBookingForDetail(b)}
              onCreateBookingAtDate={(dateStr, propId) => {
                setModalInitialDate(dateStr);
                setModalInitialPropertyId(propId || '');
                setIsBookingModalOpen(true);
              }}
              activeRole={activeRole}
            />
          )}

          {activeTab === 'properties' && (
            <PropertiesView
              properties={properties}
              staffList={staffList}
              onSelectPropertyForCalendar={(propId) => {
                setSelectedPropertyIds([propId]);
                setActiveTab('calendar');
              }}
              activeRole={activeRole}
            />
          )}

          {activeTab === 'staff' && (activeRole === 'super_admin' || activeRole === 'owner') && (
            <StaffMatrixView
              staffList={staffList}
              properties={properties}
              onUpdateStaffPropertyAccess={handleUpdateStaffPropertyAccess}
              activeRole={activeRole}
            />
          )}

          {activeTab === 'ical' && activeRole === 'super_admin' && (
            <ICalSyncView
              properties={properties}
              staffList={staffList}
              bookings={bookings}
            />
          )}

          {activeTab === 'notifications' && (activeRole === 'super_admin' || activeRole === 'owner') && (
            <NotificationLogsView
              logs={notificationLogs}
              onRefreshLogs={() => {}}
            />
          )}

          {activeTab === 'flutter' && activeRole === 'super_admin' && (
            <FlutterAppHubView
              bookings={bookings}
              properties={properties}
              staffList={staffList}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-30 flex items-center justify-around px-2 shadow-lg">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'calendar' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="text-[10px]">Calendar</span>
        </button>

        <button
          onClick={() => setActiveTab('properties')}
          className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'properties' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px]">Villas</span>
        </button>

        {/* Central Create FAB */}
        <button
          onClick={() => {
            setModalInitialDate('');
            setModalInitialPropertyId('');
            setIsBookingModalOpen(true);
          }}
          className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md flex items-center justify-center -mt-5 active:scale-95 transition-transform"
          title="Create New Booking"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'staff' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px]">Staff</span>
        </button>

        <button
          onClick={() => setActiveTab('ical')}
          className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-3 rounded-lg transition-colors ${
            activeTab === 'ical' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <RefreshCw className="w-5 h-5" />
          <span className="text-[10px]">Sync</span>
        </button>
      </div>

      {/* Modals */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSaveBooking={handleSaveBooking}
        properties={properties}
        staffList={staffList}
        activeRole={activeRole}
        activeStaff={activeStaff}
        initialDate={modalInitialDate}
        initialPropertyId={modalInitialPropertyId}
      />

      <BookingDetailModal
        booking={selectedBookingForDetail}
        property={properties.find(p => p.id === selectedBookingForDetail?.propertyId)}
        staff={staffList.find(s => s.id === selectedBookingForDetail?.assignedStaffId)}
        onClose={() => setSelectedBookingForDetail(null)}
        onDeleteBooking={handleDeleteBooking}
        onTriggerTelegramAlert={handleTriggerTelegramAlert}
        activeRole={activeRole}
      />
    </div>
  );
}
