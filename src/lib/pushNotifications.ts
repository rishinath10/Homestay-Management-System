import { supabase } from './supabase';
import { Booking, Staff, NotificationLog } from '../types';

/**
 * Request notification permissions and register Web Push Token in database
 */
export async function requestNotificationPermission(userEmail?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }

    const dummyToken = `pwa-token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (userEmail) {
      const tokenDocId = `token-${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      try {
        await supabase.from('settings').upsert({
          id: tokenDocId,
          email: userEmail.toLowerCase(),
          token: dummyToken,
          updatedAt: new Date().toISOString(),
          platform: 'PWA Web'
        });
      } catch (e) {
        console.warn('Token store failed:', e);
      }
    }

    return dummyToken;
  } catch (e) {
    console.warn('Push notification permission error:', e);
    return null;
  }
}

/**
 * Setup Foreground Notification Handler
 */
export function setupForegroundNotificationListener(callback: (title: string, body: string) => void) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.title) {
        callback(event.data.title, event.data.body || '');
      }
    });
  }
}

/**
 * Trigger local browser notification and log push alert
 */
export async function triggerNewBookingPushAlert(booking: Booking, assignedStaff: Staff) {
  const title = `🔔 New Booking: ${booking.propertyName || 'Villa'}`;
  const body = `Guest ${booking.guestName || 'Guest'} reserved from ${booking.bookingDate} to ${booking.endDate || booking.bookingDate}. Assigned to ${assignedStaff.name}.`;

  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: `booking-alert-${booking.id}`
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          if (perm === 'granted') {
            new Notification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/pwa-192x192.png',
              tag: `booking-alert-${booking.id}`
            });
          }
        });
      }
    }

    // Play alert chime sound when new booking is assigned to staff
    try {
      if (typeof window !== 'undefined' && 'Audio' in window) {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    } catch (e) {}

    const logId = `notif-push-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const logEntry: NotificationLog = {
      id: logId,
      staffId: assignedStaff.id,
      staffName: assignedStaff.name,
      bookingId: booking.id,
      propertyId: booking.propertyId,
      propertyName: booking.propertyName,
      message: `${title}: ${body}`,
      channel: 'fcm_push',
      status: 'sent',
      timestamp: new Date().toISOString(),
      recipientEmail: assignedStaff.email,
      recipientPhone: assignedStaff.phone
    };
    try {
      await supabase.from('notifications').insert(logEntry);
    } catch (e) {
      console.warn('Failed to log push alert:', e);
    }
  } catch (err) {
    console.warn('Push alert dispatch skipped safely:', err);
  }
}

/**
 * Check-in & Check-out Reminders logic for assigned staff
 */
export function checkUpcomingReminders(bookings: Booking[], staffList: Staff[]) {
  if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    const todayStr = new Date().toISOString().split('T')[0];

    bookings.forEach(booking => {
      if (booking.status === 'cancelled') return;

      const assignedStaff = staffList.find(s => s.id === booking.assignedStaffId);
      if (!assignedStaff) return;

      // Check-in Reminder (Today)
      if (booking.bookingDate === todayStr) {
        const title = `📌 Check-in Today: ${booking.propertyName || 'Villa'}`;
        const body = `Guest ${booking.guestName || 'Guest'} checks in today at ${booking.checkinTime || '15:00'}. Ensure keys and villa are ready!`;

        try {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: `checkin-reminder-${booking.id}-${todayStr}`
          });
        } catch (e) {}
      }

      // Check-out Reminder (Today)
      if (booking.endDate === todayStr) {
        const title = `📌 Check-out Today: ${booking.propertyName || 'Villa'}`;
        const body = `Guest ${booking.guestName || 'Guest'} checks out today at ${booking.checkoutTime || '12:00'}. Prepare housekeeping inspection.`;

        try {
          new Notification(title, {
            body,
            icon: '/pwa-192x192.png',
            tag: `checkout-reminder-${booking.id}-${todayStr}`
          });
        } catch (e) {}
      }
    });
  } catch (e) {
    console.warn('Reminder check skipped safely:', e);
  }
}
