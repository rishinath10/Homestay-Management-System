import React, { useState, useEffect, useRef } from 'react';
import { 
  supabase, 
  seedInitialSupabaseData, 
  DEFAULT_PROPERTIES, 
  DEFAULT_STAFF,
  logActivity
} from './lib/supabase';
import { LoginScreen } from './components/LoginScreen';
import { loadSession, signOut, AppSession } from './lib/auth';
import { Property, Staff, Booking, NotificationLog, Role, CalendarViewMode } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CalendarView } from './components/CalendarView';

// Secondary views are code-split: the calendar is the landing screen and the
// only one most staff ever open, so these chunks load on first navigation
// rather than blocking initial paint.
const PropertiesView = React.lazy(() =>
  import('./components/PropertiesView').then(m => ({ default: m.PropertiesView })));
const StaffMatrixView = React.lazy(() =>
  import('./components/StaffMatrixView').then(m => ({ default: m.StaffMatrixView })));
const MemosView = React.lazy(() =>
  import('./components/MemosView').then(m => ({ default: m.MemosView })));
const NotificationLogsView = React.lazy(() =>
  import('./components/NotificationLogsView').then(m => ({ default: m.NotificationLogsView })));
const ICalSyncView = React.lazy(() =>
  import('./components/ICalSyncView').then(m => ({ default: m.ICalSyncView })));
const SettingsView = React.lazy(() =>
  import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
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
  // loadSession() validates the stored value and treats anything corrupt as
  // logged out, so a bad localStorage entry cannot lock anyone out of the app.
  const [sessionUser, setSessionUser] = useState<AppSession | null>(() => loadSession());

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

  const displayBookings = bookings;

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

  // Hide the splash as soon as the first frame is painted, with a short cap as
  // a safety net. It used to sit on screen for a flat 1200ms regardless of
  // whether the app was ready.
  useEffect(() => {
    let done = false;
    const hide = () => {
      if (done) return;
      done = true;
      setShowPreloader(false);
    };

    const raf = requestAnimationFrame(() => requestAnimationFrame(hide));
    const cap = setTimeout(hide, 600);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(cap);
    };
  }, []);

  // Request Notification Permissions on Session Start
  useEffect(() => {
    if (sessionUser?.email) {
      requestNotificationPermission(sessionUser.email);
    }
  }, [sessionUser]);

  // Warm the code-split view chunks once the browser is idle, so the first
  // visit to each screen renders from cache instead of waiting on a download.
  // Staff are often on phone connections where that round trip is the slowest
  // part of switching tabs.
  useEffect(() => {
    if (!sessionUser) return;

    const warm = () => {
      import('./components/PropertiesView');
      import('./components/MemosView');
      import('./components/StaffMatrixView');
      import('./components/NotificationLogsView');
      import('./components/ICalSyncView');
      import('./components/SettingsView');
    };

    const ric = (window as any).requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(warm, { timeout: 4000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(warm, 2000);
    return () => clearTimeout(t);
  }, [sessionUser]);

  const propertiesJsonRef = useRef<string>('');
  const staffJsonRef = useRef<string>('');
  const bookingsJsonRef = useRef<string>('');
  const notifsJsonRef = useRef<string>('');
  const fetchAllDataRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const activeRoleRef = useRef(activeRole);
  const activeStaffRef = useRef(activeStaff);
  const staffListRef = useRef(staffList);

  useEffect(() => {
    activeRoleRef.current = activeRole;
    activeStaffRef.current = activeStaff;
    staffListRef.current = staffList;
  }, [activeRole, activeStaff, staffList]);

  // ---------------------------------------------------------------
  // Granular per-table fetchers.
  // Each table refreshes independently so a change to one table does
  // not trigger a full four-table read. Each has its own in-flight
  // guard so overlapping triggers collapse into a single request.
  // ---------------------------------------------------------------
  const inFlightRef = useRef<Record<string, boolean>>({});

  const fetchProperties = React.useCallback(async () => {
    if (inFlightRef.current.properties) return;
    inFlightRef.current.properties = true;
    try {
      const { data, error } = await supabase.from('properties').select('*');
      if (error) { console.warn('Properties fetch error:', error.message); return; }
      if (!data || data.length === 0) return;

      const uniquePropsMap = new Map<string, Property>();
      (data as Property[]).forEach(p => uniquePropsMap.set(p.id, p));
      const newProps = Array.from(uniquePropsMap.values());
      const propsStr = JSON.stringify(newProps);
      if (propsStr !== propertiesJsonRef.current) {
        propertiesJsonRef.current = propsStr;
        setProperties(newProps);
        try {
          localStorage.setItem('pd_properties_cache', propsStr);
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Properties load notice:', e);
    } finally {
      inFlightRef.current.properties = false;
    }
  }, []);

  const fetchStaff = React.useCallback(async () => {
    if (inFlightRef.current.staff) return;
    inFlightRef.current.staff = true;
    try {
      // Password is never needed client-side after login — omit it from the projection.
      const { data, error } = await supabase
        .from('staff')
        .select('id,name,email,phone,telegramChatId,role,assignedPropertyIds,avatarUrl,status,createdAt');
      if (error) { console.warn('Staff fetch error:', error.message); return; }
      if (!data || data.length === 0) return;

      const staffStr = JSON.stringify(data);
      if (staffStr !== staffJsonRef.current) {
        staffJsonRef.current = staffStr;
        setStaffList(data as Staff[]);
      }
    } catch (e) {
      console.warn('Staff load notice:', e);
    } finally {
      inFlightRef.current.staff = false;
    }
  }, []);

  const fetchBookings = React.useCallback(async () => {
    if (inFlightRef.current.bookings) return;
    inFlightRef.current.bookings = true;
    try {
      const { data, error } = await supabase.from('bookings').select('*');
      if (error) { console.warn('Bookings fetch error:', error.message); return; }

      const remoteBookings = (data as Booking[]) || [];
      const bookingsStr = JSON.stringify(remoteBookings);
      if (bookingsStr === bookingsJsonRef.current) return;

      if (initialLoadDoneRef.current) {
        const curRole = activeRoleRef.current;
        const curStaff = activeStaffRef.current;
        const curStaffList = staffListRef.current;

        remoteBookings.forEach(b => {
          if (!knownBookingIdsRef.current.has(b.id)) {
            knownBookingIdsRef.current.add(b.id);

            const isAssigned = (curStaff && b.assignedStaffId === curStaff.id) ||
              (curStaff && curStaff.assignedPropertyIds?.includes(b.propertyId)) ||
              (curRole === 'staff');

            if (isAssigned) {
              const staffRecipient = curStaff || curStaffList.find(s => s.id === b.assignedStaffId) || {
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
        localStorage.setItem('pd_bookings_cache', bookingsStr);
      } catch (e) {}
    } catch (e) {
      console.warn('Bookings load notice:', e);
    } finally {
      inFlightRef.current.bookings = false;
    }
  }, []);

  const fetchNotifications = React.useCallback(async () => {
    if (inFlightRef.current.notifications) return;
    inFlightRef.current.notifications = true;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);
      if (error) { console.warn('Notifications fetch error:', error.message); return; }
      if (!data) return;

      const notifsStr = JSON.stringify(data);
      if (notifsStr !== notifsJsonRef.current) {
        notifsJsonRef.current = notifsStr;
        setNotificationLogs(data as NotificationLog[]);
      }
    } catch (e) {
      console.warn('Notifications load notice:', e);
    } finally {
      inFlightRef.current.notifications = false;
    }
  }, []);

  const fetchAllData = React.useCallback(async () => {
    await Promise.all([
      fetchProperties(),
      fetchStaff(),
      fetchBookings(),
      fetchNotifications(),
    ]);
  }, [fetchProperties, fetchStaff, fetchBookings, fetchNotifications]);

  const fetchPropertiesRef = useRef(fetchProperties);
  const fetchStaffRef = useRef(fetchStaff);
  const fetchBookingsRef = useRef(fetchBookings);
  const fetchNotificationsRef = useRef(fetchNotifications);

  useEffect(() => {
    fetchAllDataRef.current = fetchAllData;
    fetchPropertiesRef.current = fetchProperties;
    fetchStaffRef.current = fetchStaff;
    fetchBookingsRef.current = fetchBookings;
    fetchNotificationsRef.current = fetchNotifications;
  }, [fetchAllData, fetchProperties, fetchStaff, fetchBookings, fetchNotifications]);

  // Initial Setup: Seed Supabase & Listeners (Runs only once on mount)
  useEffect(() => {
    seedInitialSupabaseData();

    // Coalesce bursts of realtime events into one read per table.
    const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};
    const scheduleFetch = (key: string, fn: () => void, delay = 400) => {
      clearTimeout(debounceTimers[key]);
      debounceTimers[key] = setTimeout(fn, delay);
    };

    // Refetching on every tab focus is wasteful when someone is switching
    // between tabs constantly. Realtime already keeps state current, so
    // this only acts as a catch-up after the tab has been away a while.
    let lastVisibilitySync = Date.now();
    const VISIBILITY_SYNC_MIN_GAP = 60_000;

    const handleOnline = () => {
      setIsOnline(true);
      fetchAllDataRef.current();
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilitySync < VISIBILITY_SYNC_MIN_GAP) return;
      lastVisibilitySync = now;
      fetchAllDataRef.current();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    fetchAllDataRef.current();

    // Safety-net poll only. Realtime is the primary sync path; this exists
    // purely to recover from a silently dead socket. It is skipped entirely
    // while the tab is hidden or the device is offline.
    const POLL_INTERVAL = 5 * 60 * 1000;
    const pollingInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      if (!navigator.onLine) return;
      fetchAllDataRef.current();
    }, POLL_INTERVAL);

    let currentChannel: any = null;
    let retryTimer: any = null;
    let retryCount = 0;
    let disposed = false;
    let reconnectPending = false;

    const MAX_RETRY_DELAY = 60_000;

    const teardown = (ch: any) => {
      if (!ch) return;
      try {
        supabase.removeChannel(ch);
      } catch (e) {
        console.warn('Channel teardown notice:', e);
      }
    };

    // Reconnect must never run synchronously inside the subscribe() status
    // callback. removeChannel() there re-enters the realtime client's own
    // trigger() -> onClose() -> trigger() path and overflows the call stack,
    // which takes the whole tab down. Defer the teardown to a fresh task and
    // guard against overlapping reconnects.
    const scheduleReconnect = () => {
      if (disposed || reconnectPending) return;
      reconnectPending = true;

      const dying = currentChannel;
      currentChannel = null;

      setTimeout(() => {
        teardown(dying);
        if (disposed) return;

        fetchAllDataRef.current();

        const delay = Math.min(5000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
        retryCount++;
        retryTimer = setTimeout(() => {
          reconnectPending = false;
          if (!disposed) setupChannel();
        }, delay);
      }, 0);
    };

    const setupChannel = () => {
      if (disposed) return;

      if (currentChannel) {
        teardown(currentChannel);
        currentChannel = null;
      }

      const channel = supabase
        .channel('realtime_tables_sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'properties' },
          () => scheduleFetch('properties', () => fetchPropertiesRef.current()))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' },
          () => scheduleFetch('staff', () => fetchStaffRef.current()))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bookings' }, (payload) => {
          const newB = payload.new as Booking;
          const curRole = activeRoleRef.current;
          const curStaff = activeStaffRef.current;
          const curStaffList = staffListRef.current;

          if (newB && newB.id && !knownBookingIdsRef.current.has(newB.id)) {
            knownBookingIdsRef.current.add(newB.id);
            const isAssigned = (curStaff && newB.assignedStaffId === curStaff.id) ||
              (curStaff && curStaff.assignedPropertyIds?.includes(newB.propertyId)) ||
              (curRole === 'staff');

            if (isAssigned) {
              const staffRecipient = curStaff || curStaffList.find(s => s.id === newB.assignedStaffId) || {
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
          scheduleFetch('bookings', () => fetchBookingsRef.current());
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings' },
          () => scheduleFetch('bookings', () => fetchBookingsRef.current()))
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'bookings' },
          () => scheduleFetch('bookings', () => fetchBookingsRef.current()))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' },
          () => scheduleFetch('notifications', () => fetchNotificationsRef.current(), 2000));

      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          retryCount = 0;
          reconnectPending = false;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          scheduleReconnect();
        }
      });

      currentChannel = channel;
    };

    setupChannel();

    // Setup Push Notification Foreground Listener
    setupForegroundNotificationListener((title, body) => {
      console.log('Foreground push notification received:', title, body);
    });

    return () => {
      disposed = true;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(pollingInterval);
      Object.values(debounceTimers).forEach(clearTimeout);
      if (retryTimer) clearTimeout(retryTimer);
      teardown(currentChannel);
      currentChannel = null;
    };
  }, []);

  // 2. Run Check-in / Check-out reminders once after initial data load
  const remindersCheckedRef = useRef(false);
  useEffect(() => {
    if (bookings.length > 0 && staffList.length > 0 && !remindersCheckedRef.current) {
      remindersCheckedRef.current = true;
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
    // Clear the session first so the UI responds immediately. The audit write
    // is fire-and-forget; only the server-side revoke is awaited, and even that
    // does not hold up the redirect to the login screen.
    if (sessionUser) {
      logActivity(sessionUser.email, sessionUser.name, sessionUser.role, 'Logged Out').catch(() => {});
    }
    setSessionUser(null);
    signOut().catch(() => {});
  };

  // On phones the sidebar is an overlay, so it has to close after a selection
  // to reveal the content behind it. On tablet and desktop it is a persistent
  // column — closing it there just hides the navigation after every click.
  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  const handleSelectTab = (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    // Switch immediately. The previous version showed the full-screen preloader
    // for a fixed 600ms plus a 0.7s fade — around 1.2s of deliberate waiting on
    // every navigation, with no work happening behind it. If a lazily loaded
    // view has not been fetched yet, the Suspense fallback covers that case.
    setActiveTab(tab);
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
            // signIn() has already persisted the session; just adopt it here.
            // Logging is fire-and-forget: the user should not wait on an audit
            // write, and previously also sat through a fixed 800ms splash.
            setSessionUser(user);
            logActivity(user.email, user.name, user.role, 'Logged In').catch(() => {});
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
            closeSidebarOnMobile();
          }}
          onCreateBookingClick={() => {
            setModalInitialDate('');
            setModalInitialPropertyId('');
            setEditingBooking(null);
            setIsBookingModalOpen(true);
            closeSidebarOnMobile();
          }}
          properties={properties}
          selectedPropertyIds={selectedPropertyIds}
          onTogglePropertyFilter={handleTogglePropertyFilter}
          onSelectAllProperties={handleSelectAllProperties}
          currentDate={currentDate}
          onSelectDate={(d) => {
            setCurrentDate(d);
            handleSelectTab('calendar');
            closeSidebarOnMobile();
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
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            }
          >
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
                userEmail={sessionUser.email}
                userName={sessionUser.name}
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
          </React.Suspense>
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
