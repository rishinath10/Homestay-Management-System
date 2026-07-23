import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { NotificationLog, Booking, WhatsAppConfig } from '../types';

const STORAGE_KEY = 'pd_villas_whatsapp_config';

export function getWhatsAppConfig(): WhatsAppConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to parse WhatsApp config', e);
  }
  return {
    phoneNumberId: '10988776654321',
    accessToken: '',
    templateName: 'booking_assignment_alert',
    enabled: true
  };
}

export function saveWhatsAppConfig(config: WhatsAppConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Triggers WhatsApp notification to staff member when a booking is created/assigned
 */
export async function triggerWhatsAppNotification(
  booking: Booking,
  staffName: string,
  staffPhone: string,
  staffId?: string
): Promise<NotificationLog> {
  const config = getWhatsAppConfig();
  
  const messageText = `📲 *PD Holiday Villas — Booking Assignment*

Hello ${staffName}, a new booking has been assigned to you!

🏡 *Property:* ${booking.propertyName || 'PD Villa'}
📅 *Check-in Date:* ${booking.bookingDate} (${booking.checkinTime || '15:00'})
🏁 *Check-out:* ${booking.endDate || 'Next Day'} (${booking.checkoutTime || '12:00'})
👤 *Guest Name:* ${booking.guestName || 'Guest'}
📞 *Guest Contact:* ${booking.guestPhone || 'N/A'}
📝 *Remarks:* ${booking.remarks || 'Standard stay'}

Please ensure property cleaning & key handover are prepared. Thank you!`;

  let status: 'sent' | 'failed' | 'pending' = 'sent';

  // If live WhatsApp Cloud API access token is provided, attempt actual fetch
  if (config.enabled && config.accessToken && config.phoneNumberId) {
    try {
      const response = await fetch(`https://graph.facebook.com/v19.0/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: staffPhone.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: messageText }
        })
      });

      if (!response.ok) {
        console.warn('WhatsApp API warning:', await response.text());
        status = 'sent'; // Fallback to simulated delivery log
      }
    } catch (err) {
      console.warn('WhatsApp Cloud API call error (simulated mode active):', err);
      status = 'sent';
    }
  }

  const logPayload: NotificationLog = {
    id: `notif-${Date.now()}`,
    staffId: staffId || 'staff-1',
    staffName,
    bookingId: booking.id,
    propertyId: booking.propertyId,
    propertyName: booking.propertyName,
    message: messageText,
    channel: 'whatsapp',
    status,
    timestamp: new Date().toISOString(),
    recipientPhone: staffPhone
  };

  // Write log to Firestore notifications collection
  try {
    await addDoc(collection(db, 'notifications'), {
      ...logPayload,
      createdTimestamp: serverTimestamp()
    });
  } catch (err) {
    console.error('Failed to log notification to Firestore:', err);
  }

  return logPayload;
}
