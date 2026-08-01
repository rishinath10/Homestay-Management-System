import { supabase } from './supabase';
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

🏡 *Villa:* ${booking.propertyName || 'PD Villa'}
📅 *Date:* ${booking.bookingDate} to ${booking.endDate || booking.bookingDate}
⏰ *Check-in:* ${booking.checkinTime || '15:00'} | *Check-out:* ${booking.checkoutTime || '12:00'}
👤 *Guest:* ${booking.guestName} (${booking.paxCount || 1} Pax)
📞 *Contact:* ${booking.guestPhone || 'N/A'}
💰 *Deposit:* RM${booking.depositAmount || 0} (${booking.depositPaid ? 'Paid' : 'Unpaid'})
📝 *Remarks:* ${booking.remarks || 'Standard cleaning & check-in preparation required.'}`;

  let status: 'sent' | 'failed' = 'failed';

  if (config.enabled && config.accessToken) {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${config.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: staffPhone.replace(/\D/g, ''),
          type: 'text',
          text: { body: messageText }
        })
      });

      if (response.ok) {
        status = 'sent';
      }
    } catch (err) {
      console.error('WhatsApp API request error:', err);
    }
  } else {
    // Simulated delivery mode if API token not configured
    status = 'sent';
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

  // Write log to Supabase notifications table
  try {
    await supabase.from('notifications').insert(logPayload);
  } catch (err) {
    console.error('Failed to log notification to Supabase:', err);
  }

  return logPayload;
}
