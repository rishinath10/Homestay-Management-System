import React, { useState, useEffect, useRef } from 'react';
import { 
  supabase, 
  seedInitialSupabaseData, 
  DEFAULT_PROPERTIES, 
  DEFAULT_STAFF,
  logActivity
} from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { Property, Staff, Booking, NotificationLog, Role, CalendarViewMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';
import { PropertiesView } from './components/PropertiesView';
import { StaffMatrixView } from './components/StaffMatrixView';
import { MemosView } from './components/MemosView';
import { NotificationLogsView } from './components/NotificationLogsView';
import { ICalSyncView } from './components/ICalSyncView';
import { SettingsView } from './components/SettingsView';
import { BookingModal } from './components/BookingModal';
import { BookingDetailModal } from './components/BookingDetailModal';
import { Preloader } from './components/Preloader';
import { triggerTelegramAndEmailAlerts } from './lib/telegramEmail';
import { 
  requestNotificationPermission, 
  setupForegroundNotificationListener, 
  checkUpcomingReminders,
  triggerNewBookingPushAlert
} from './lib/pushNotifications';
import { addMonths, subMonths } from 'date-fns';
import { Calendar as CalendarIcon, Home, Users, Plus, RefreshCw, SendHorizontal, StickyNote } from 'lucide-react';

export default function App() {
  // Preloader State with guaranteed auto-hide
  const [showPreloader, setShowPreloader] = useState(true);

  // User Session State
  const [sessionUser, setSessionUser] = useState<{ email: string; name: string; role: Role; staffObj: Staff | null } | null>(() => {
    const stored = localStorage.getItem('pd_session');
    return stored ? JSON.parse(stored) : null;
  });

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<'calendar' | 'properties' | 'staff' | 'memos' | 'ical' | 'notifications' | 'settings'>('calendar');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Supabase / Database Data Collections
  const [properties, setProperties] = useState<Property[]>(() => {
    try {
      const cached = localStorage.getItem('pd_properties_cache');
      return cached ? JSON.parse(cached) : DEFAULT_PROPERTIES;
    } catch (e) {
      return DEFAULT_PROPERTIES;
    }
  });
  const [staffList, setStaffList] = useState<Staff[]>(DEFAULT_STAFF);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);

  // Derived Access Context from Session
  const activeRole = sessionUser?.role || 'staff';
  const activeStaff = sessionUser?.staffObj || null;
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>(DEFAULT_PROPERTIES.map(p => p.id));

  const displayBookings = React.useMemo(() => {
    // All logged in users (Super Admin, Owner, Staff) can view all saved bookings
    return bookings;
  }, [bookings]);

  // Network & Auth State
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Modals
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [selectedBookingForDetail, setSelectedBookingForDetail] = useState<Booking | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<string>('');
  const [modalInitialPropertyId, setModalInitialPropertyId] = useState<string>('');
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Notification Tracking Refs
  const knownBookingIdsRef = React.useRef<Set<string>>(new Set());
  const initialLoadDoneRef = React.useRef<boolean>(false);

  // Guaranteed Preloader Hide
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Request Notification Permissions on Session Start
  useEffect(() => {
    if (sessionUser?.email) {
      requestNotificationPermission(sessionUser.email);
    }
  }, [sessionUser]);

  const propertiesJsonRef = useRef<string>('');
  const staffJsonRef = useRef<string>('');
  const bookingsJsonRef = useRef<string>('');
  const notifsJsonRef = useRef<string>('');

  // 1. Fetch All Data helper (component-level function accessible by all handlers)
  const fetchAllData = React.useCallback(async () => {
    try {
      const { data: pData } = await supabase.from('properties').select('*');
      if (pData && pData.length > 0) {
        const uniquePropsMap = new Map<string, Property>();
        (pData as Property[]).forEach(p => uniquePropsMap.set(p.id, p));
        const newProps = Array.from(uniquePropsMap.values());
        const propsStr = JSON.stringify(newProps);
        if (propsStr !== propertiesJsonRef.current) {
          propertiesJsonRef.current = propsStr;
          setProperties(newProps);
          try {
            localStorage.setItem('pd_properties_cache', JSON.stringify(newProps));
          } catch (e) {}
        }
      }

      const { data: sData } = await supabase.from('staff').select('*');
      if (sData && sData.length > 0) {
        const staffStr = JSON.stringify(sData);
        if (staffStr !== staffJsonRef.current) {
          staffJsonRef.current = staffStr;
          setStaffList(sData as Staff[]);
        }
      }

      const { data: bData } = await supabase.from('bookings').select('*');
      const remoteBookings = (bData as Booking[]) || [];
      const bookingsStr = JSON.stringify(remoteBookings);

      if (bookingsStr !== bookingsJsonRef.current) {
        if (initialLoadDoneRef.current) {
          remoteBookings.forEach(b => {
            if (!knownBookingIdsRef.current.has(b.id)) {
              knownBookingIdsRef.current.add(b.id);
              
              const isAssigned = (activeStaff && b.assignedStaffId === activeStaff.id) ||
                (activeStaff && activeStaff.assignedPropertyIds?.includes(b.propertyId)) ||
                (activeRole === 'staff');

              if (isAssigned) {
                const staffRecipient = activeStaff || staffList.find(s => s.id === b.assignedStaffId) || {
                  id: 'staff-1',
                  name: b.assignedStaffName || 'Staff Member',
                  email: '',
                  phone: '',
                  role: 'staff',
                  assignedPropertyIds: [b.propertyId]
                };
                triggerNewBookingPushAlert(b, staffRecipient);
              }
            }
          });
        } else {
          remoteBookings.forEach(b => knownBookingIdsRef.current.add(b.id));
          initialLoadDoneRef.current = true;
        }

        bookingsJsonRef.current = bookingsStr;
        setBookings(remoteBookings);
        try {
          localStorage.setItem('pd_bookings_cache', JSON.stringify(remoteBookings));
        } catch (e) {}
      }

      const { data: nData } = await supabase.from('notifications').select('*').order('timestamp', { ascending: false }).limit(50);
      if (nData) {
        const notifsStr = JSON.stringify(nData);
        if (notifsStr !== notifsJsonRef.current) {
          notifsJsonRef.current = notifsStr;
          setNotificationLogs(nData as NotificationLog[]);
        }
      }
    } catch (e) {
      console.warn('Data load notice:', e);
    }
  }, [activeRole, activeStaff, staffList]);

  // Initial Setup: Seed Supabase & Listeners (Runs only once on mount)
  useEffect(() => {
    seedInitialSupabaseData();

    // Online/Offline Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchAllData();

    // Real-time Supabase Listeners with Push Notification Alert Trigger
    const channel = supabase
      .channel('realtime_tables_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, fetchAllData)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
        const newB = payload.new as Booking;
        if (newB && newB.id && !knownBookingIdsRef.current.has(newB.id)) {
          knownBookingIdsRef.current.add(newB.id);
          const isAssigned = (activeStaff && newB.assignedStaffId === activeStaff.id) ||
            (activeStaff && activeStaff.assignedPropertyIds?.includes(newB.propertyId)) ||
            (activeRole === 'staff');

          if (isAssigned) {
            const staffRecipient = activeStaff || staffList.find(s => s.id === newB.assignedStaffId) || {
              id: 'staff-1',
              name: newB.assignedStaffName || 'Staff Member',
              email: '',
              phone: '',
              role: 'staff',
              assignedPropertyIds: [newB.propertyId]
            };
            triggerNewBookingPushAlert(newB, staffRecipient);
          }
        }
        fetchAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchAllData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchAllData)
      .subscribe();

    // Setup Push Notification Foreground Listener
    setupForegroundNotificationListener((title, body) => {
      console.log('Foreground push notification received:', title, body);
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      supabase.removeChannel(channel);
    };
  }, [fetchAllData]);

  // 2. Run Check-in / Check-out reminders when bookings or staff list loads/updates
  useEffect(() => {
    if (bookings.length > 0 && staffList.length > 0) {
      checkUpcomingReminders(bookings, staffList);
    }
  }, [bookings, staffList]);

  // Update filtered selected properties when role/staff changes or properties load
  useEffect(() => {
    if (properties.length === 0) return;

    if (activeRole === 'super_admin' || activeRole === 'owner') {
      setSelectedPropertyIds(properties.map(p => p.id));
    } else if (activeStaff && activeStaff.assignedPropertyIds && activeStaff.assignedPropertyIds.length > 0) {
      setSelectedPropertyIds(activeStaff.assignedPropertyIds);
    } else {
      setSelectedPropertyIds(properties.map(p => p.id));
    }
  }, [activeRole, activeStaff, properties]);

  // Auth Handlers
  const handleGoogleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
    } catch (err) {
      console.warn('Google Auth popup fallback:', err);
    }
  };

  const handleLogout = async () => {
    setShowPreloader(true);
    if (sessionUser) {
      try {
        await logActivity(sessionUser.email, sessionUser.name, sessionUser.role, 'Logged Out').catch(() => {});
      } catch (e) {}
    }
    localStorage.removeItem('pd_session');
    setSessionUser(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out error:', err);
    }
    setTimeout(() => {
      setShowPreloader(false);
    }, 800);
  };

  const handleSelectTab = (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    setShowPreloader(true);
    setTimeout(() => {
      setActiveTab(tab);
      setTimeout(() => {
        setShowPreloader(false);
      }, 400);
    }, 200);
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

      // Create warning notification in Supabase
      try {
        const notifId = `notif-${Date.now()}`;
        await supabase.from('notifications').insert({
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

    // 1. Optimistically update local state immediately so calendar reflects the booking instantly
    setBookings(prev => {
      const index = prev.findIndex(b => b.id === newBooking.id);
      let updated: Booking[];
      if (index >= 0) {
        updated = [...prev];
        updated[index] = newBooking as Booking;
      } else {
        updated = [...prev, newBooking as Booking];
      }
      try {
        localStorage.setItem('pd_bookings_cache', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // 2. Save to Supabase DB asynchronously
    try {
      const { error: upsertErr } = await supabase.from('bookings').upsert(newBooking);
      if (upsertErr) {
        console.error('Supabase bookings upsert error:', upsertErr.message);
        alert(`⚠️ Could not save booking to database: ${upsertErr.message}`);
      } else {
        // Re-fetch all data to ensure local state and cache are completely synced
        fetchAllData().catch(err => console.warn('Background sync error:', err));
      }
    } catch (e: any) {
      console.error('Supabase bookings save exception:', e);
      alert(`⚠️ Could not save booking to database: ${e?.message || 'Network error'}`);
    }

    // 3. Log Activity silently in background
    try {
      await logActivity(
        sessionUser?.email || 'unknown',
        sessionUser?.name || 'Unknown',
        activeRole,
        bookingData.id ? 'Updated Booking' : 'Created Booking',
        `Booking ID: ${bookingId}, Guest: ${newBooking.guestName}, Property: ${newBooking.propertyName}`
      );
    } catch (err) {
      console.warn('Failed to log activity:', err);
    }

    // 4. Trigger Telegram + Email + Push notification alert to assigned staff
    const targetStaffId = newBooking.assignedStaffId || bookingData.assignedStaffId;
    const assignedStaffObj = staffList.find(s => s.id === targetStaffId) || staffList[0];
    if (assignedStaffObj) {
      triggerTelegramAndEmailAlerts(newBooking as Booking, assignedStaffObj).catch(e => console.warn('Alert dispatch failed:', e));
    }
  };

  // Delete Booking Handler
  const handleDeleteBooking = async (bookingId: string) => {
    const bookingToDelete = bookings.find(b => b.id === bookingId);
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    const { error: delErr } = await supabase.from('bookings').delete().eq('id', bookingId);
    if (delErr) {
      console.error('Failed to delete booking from Supabase:', delErr.message);
      alert(`⚠️ Could not delete booking from database: ${delErr.message}`);
    }
    await fetchAllData();

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
    const staffData = staffObj || { id: staffId, name: 'Staff', email: '', phone: '', role: 'staff', assignedPropertyIds: [] };
    
    await supabase.from('staff').upsert({
      ...staffData,
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
      <>
        <Preloader isVisible={showPreloader} />
        <LoginScreen
          onLoginSuccess={async (user) => {
            setShowPreloader(true);
            localStorage.setItem('pd_session', JSON.stringify(user));
            setSessionUser(user);
            await logActivity(user.email, user.name, user.role, 'Logged In').catch(() => {});
            setTimeout(() => {
              setShowPreloader(false);
            }, 800);
          }}
        />
      </>
    );
  }

  return (
    <>
    <Preloader isVisible={showPreloader} />
    <div className="h-dvh w-screen bg-gray-100 flex flex-col font-sans overflow-hidden">
      {/* Top Header - Mobile Only */}
      <div className="md:hidden">
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
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseSidebar={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={(tab) => {
            handleSelectTab(tab);
            setIsSidebarOpen(false);
          }}
          onCreateBookingClick={() => {
            setModalInitialDate('');
            setModalInitialPropertyId('');
            setEditingBooking(null);
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
            handleSelectTab('calendar');
            setIsSidebarOpen(false);
          }}
          activeRole={activeRole}
          activeStaff={activeStaff}
          isOnline={isOnline}
          userName={sessionUser.name}
          userEmail={sessionUser.email}
          onSignOut={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {/* Content Views */}
        <main className="flex-1 flex flex-col overflow-hidden bg-gray-50 pb-16 md:pb-0">
          {activeTab === 'calendar' && (
            <div key="calendar" className="flex-1 flex flex-col overflow-hidden animate-fade-up">
              <CalendarView
                currentDate={currentDate}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                bookings={displayBookings}
                properties={properties}
                selectedPropertyIds={selectedPropertyIds}
                onSelectBooking={(b) => setSelectedBookingForDetail(b)}
                onCreateBookingAtDate={(dateStr, propId) => {
                  setModalInitialDate(dateStr);
                  setModalInitialPropertyId(propId || '');
                  setEditingBooking(null);
                  setIsBookingModalOpen(true);
                }}
                activeRole={activeRole}
                onNavigateDate={handleNavigateDate}
              />
            </div>
          )}

          {activeTab === 'properties' && (
            <div key="properties" className="flex-1 flex flex-col overflow-hidden animate-fade-up">
              <PropertiesView
                properties={properties}
                staffList={staffList}
                onSelectPropertyForCalendar={(propId) => {
                  setSelectedPropertyIds([propId]);
                  handleSelectTab('calendar');
                }}
                activeRole={activeRole}
                userEmail={sessionUser.email}
                userName={sessionUser.name}
                onRefreshData={fetchAllData}
                onBackToCalendar={() => handleSelectTab('calendar')}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}

          {activeTab === 'staff' && activeRole === 'super_admin' && (
            <div key="staff" className="flex-1 flex flex-col overflow-hidden animate-fade-up">
              <StaffMatrixView
                staffList={staffList}
                properties={properties}
                onUpdateStaffPropertyAccess={handleUpdateStaffPropertyAccess}
                activeRole={activeRole}
                onBackToCalendar={() => handleSelectTab('calendar')}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}

          {activeTab === 'memos' && (
            <div key="memos" className="flex-1 flex flex-col overflow-hidden animate-fade-up">
              <MemosView
                properties={properties}
                activeRole={activeRole}
                activeStaff={activeStaff}
                userEmail={sessionUser.email}
                userName={sessionUser.name}
                onBackToCalendar={() => handleSelectTab('calendar')}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}

          {activeTab === 'ical' && activeRole === 'super_admin' && (
            <div key="ical" className="flex-1 flex flex-col overflow-hidden animate-fade-up">
              <ICalSyncView
                properties={properties}
                staffList={staffList}
                bookings={bookings}
                onBackToCalendar={() => handleSelectTab('calendar')}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}

          {activeTab === 'notifications' && (activeRole === 'super_admin' || activeRole === 'owner') && (
            <div key="notifications" className="flex-1 flex flex-col overflow-hidden animate-fade-up">
              <NotificationLogsView
                logs={notificationLogs}
                onRefreshLogs={() => {}}
                onBackToCalendar={() => handleSelectTab('calendar')}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}

          {activeTab === 'settings' && (activeRole === 'super_admin' || activeRole === 'owner') && (
            <div key="settings" className="flex-1 flex flex-col overflow-hidden animate-fade-up">
              <SettingsView
                activeRole={activeRole}
                userEmail={sessionUser.email}
                userName={sessionUser.name}
                onBackToCalendar={() => handleSelectTab('calendar')}
                isSidebarOpen={isSidebarOpen}
                onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
              />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar - Only Calendar, Memos & Sync */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 z-30 flex items-center justify-around px-4 shadow-lg">
        <button
          onClick={() => handleSelectTab('calendar')}
          className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-4 rounded-lg transition-colors ${
            activeTab === 'calendar' ? 'text-blue-600 font-bold' : 'text-gray-500'
          }`}
        >
          <CalendarIcon className="w-5 h-5" />
          <span className="text-[11px] font-medium">Calendar</span>
        </button>

        <button
          onClick={() => handleSelectTab('memos')}
          className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-4 rounded-lg transition-colors ${
            activeTab === 'memos' ? 'text-amber-600 font-bold' : 'text-gray-500'
          }`}
        >
          <StickyNote className="w-5 h-5" />
          <span className="text-[11px] font-medium">Memos</span>
        </button>

        {activeRole === 'super_admin' && (
          <button
            onClick={() => handleSelectTab('ical')}
            className={`flex flex-col items-center justify-center space-y-0.5 py-1 px-4 rounded-lg transition-colors ${
              activeTab === 'ical' ? 'text-blue-600 font-bold' : 'text-gray-500'
            }`}
          >
            <RefreshCw className="w-5 h-5" />
            <span className="text-[11px] font-medium">Sync</span>
          </button>
        )}
      </div>

      {/* Modals */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setEditingBooking(null);
        }}
        onSaveBooking={handleSaveBooking}
        properties={properties}
        staffList={staffList}
        activeRole={activeRole}
        activeStaff={activeStaff}
        initialDate={modalInitialDate}
        initialPropertyId={modalInitialPropertyId}
        editingBooking={editingBooking}
      />

      <BookingDetailModal
        booking={selectedBookingForDetail}
        property={properties.find(p => p.id === selectedBookingForDetail?.propertyId)}
        staff={staffList.find(s => s.id === selectedBookingForDetail?.assignedStaffId)}
        onClose={() => setSelectedBookingForDetail(null)}
        onDeleteBooking={handleDeleteBooking}
        onEditBooking={(bookingToEdit) => {
          setEditingBooking(bookingToEdit);
          setSelectedBookingForDetail(null);
          setIsBookingModalOpen(true);
        }}
        onTriggerTelegramAlert={handleTriggerTelegramAlert}
        activeRole={activeRole}
      />
    </div>
    </>
  );
}
