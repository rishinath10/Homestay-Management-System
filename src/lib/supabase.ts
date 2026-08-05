import { createClient } from '@supabase/supabase-js';
import { Property, Staff, Booking, NotificationLog, Role, VillaMemo } from '../types';

// Read Supabase environment credentials with safe fallback
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || 'https://tcwrtxizwnbnttukfrir.supabase.co';
const defaultKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjd3J0eGl6d25ibnR0dWtmcmlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjA3NzMsImV4cCI6MjEwMDczNjc3M30.9lxFX743LdZF1QBJ3-zBCydx3Ktw8b6mk0irbOdxC00';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || defaultKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const DEFAULT_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    name: 'Birds Nest',
    code: 'PD-BN',
    address: 'Batu 8, Jalan Pantai, Teluk Kemang, 71050 Port Dickson',
    description: 'Luxury treetop sanctuary villa with private plunge pool and garden deck.',
    color: '#1a73e8',
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80',
    bedrooms: 4,
    maxGuests: 12,
    icalUrls: {
      airbnb: 'https://www.airbnb.com/calendar/ical/demo-birds-nest.ics',
      bookingCom: 'https://admin.booking.com/hotel/ical/demo-birds-nest.ics',
      agoda: 'https://ycs.agoda.com/ical/demo-birds-nest.ics'
    }
  },
  {
    id: 'prop-2',
    name: 'Nuri',
    code: 'PD-NR',
    address: 'Lot 1422, Jalan Batu 9, Port Dickson, Negeri Sembilan',
    description: 'Charming tropical bird-themed homestay with outdoor BBQ pavilion and garden.',
    color: '#00897b',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    bedrooms: 3,
    maxGuests: 10,
    icalUrls: {
      airbnb: 'https://www.airbnb.com/calendar/ical/demo-nuri.ics',
      bookingCom: 'https://admin.booking.com/hotel/ical/demo-nuri.ics',
      agoda: 'https://ycs.agoda.com/ical/demo-nuri.ics'
    }
  },
  {
    id: 'prop-3',
    name: 'The Bay',
    code: 'PD-TB',
    address: 'Jalan Kemang 4, Teluk Kemang, 71050 Port Dickson',
    description: 'Spacious coastal villa right near the sandy bay with private pool & outdoor lounge.',
    color: '#e65100',
    imageUrl: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80',
    bedrooms: 5,
    maxGuests: 16,
    icalUrls: {
      airbnb: 'https://www.airbnb.com/calendar/ical/demo-the-bay.ics',
      bookingCom: 'https://admin.booking.com/hotel/ical/demo-the-bay.ics',
      agoda: 'https://ycs.agoda.com/ical/demo-the-bay.ics'
    }
  },
  {
    id: 'prop-4',
    name: 'Bella Vista',
    code: 'PD-BV',
    address: 'Batu 12, Jalan Pantai, Pasir Panjang, 71250 Port Dickson',
    description: 'Panoromic ocean view villa with sun terrace, infinity gazebo & modern decor.',
    color: '#8e24aa',
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    bedrooms: 4,
    maxGuests: 12,
    icalUrls: {
      airbnb: 'https://www.airbnb.com/calendar/ical/demo-bella-vista.ics',
      bookingCom: 'https://admin.booking.com/hotel/ical/demo-bella-vista.ics',
      agoda: 'https://ycs.agoda.com/ical/demo-bella-vista.ics'
    }
  },
  {
    id: 'prop-5',
    name: 'Sounds of the Sea',
    code: 'PD-SS',
    address: 'Pantai Saujana, Batu 4, Jalan Pantai, Port Dickson',
    description: 'Beachfront paradise where wave sounds soothe your stay, includes private BBQ pit.',
    color: '#43a047',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    bedrooms: 3,
    maxGuests: 8,
    icalUrls: {
      airbnb: 'https://www.airbnb.com/calendar/ical/demo-sounds-of-sea.ics',
      bookingCom: 'https://admin.booking.com/hotel/ical/demo-sounds-of-sea.ics',
      agoda: 'https://ycs.agoda.com/ical/demo-sounds-of-sea.ics'
    }
  }
];

export const DEFAULT_STAFF: Staff[] = [
  {
    id: 'staff-1',
    name: 'Sue',
    email: 'cikrayau00@gmail.com',
    phone: '+60123456789',
    telegramChatId: '@sue_pdvillas',
    role: 'staff',
    assignedPropertyIds: ['prop-1', 'prop-2'],
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    status: 'active',
    password: 'Sue_123'
  },
  {
    id: 'staff-2',
    name: 'Yati',
    email: 'noorhayatiariffin18@gmail.com',
    phone: '+60198765432',
    telegramChatId: '@yati_pdvillas',
    role: 'staff',
    assignedPropertyIds: ['prop-3', 'prop-4', 'prop-5'],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    status: 'active',
    password: 'Yati_123'
  }
];

export async function seedInitialSupabaseData() {
  try {
    const { data: existingProps } = await supabase.from('properties').select('id');
    if (existingProps && existingProps.length > 0) {
      // Database already has properties! DO NOT overwrite user-edited villa codes or details.
      return;
    }

    for (const p of DEFAULT_PROPERTIES) {
      await supabase.from('properties').upsert(p);
    }

    for (const s of DEFAULT_STAFF) {
      await supabase.from('staff').upsert(s);
    }
  } catch (err) {
    console.warn('Supabase data seeding skipped:', err);
  }
}

export async function clearAllDatabaseCollections() {
  const collectionsToClear = ['properties', 'staff', 'bookings', 'notifications', 'activity_logs', 'villa_memos'];
  for (const collName of collectionsToClear) {
    try {
      await supabase.from(collName).delete().neq('id', 'null');
    } catch (err) {
      console.warn(`Failed to clear table ${collName}:`, err);
    }
  }
  try {
    await supabase.from('settings').upsert({ id: 'system_config', seeded: true });
  } catch (err) {}
}

export async function resetSystemConfig() {
  try {
    await supabase.from('settings').upsert({ id: 'system_config', seeded: false });
  } catch (err) {}
}

export async function logActivity(userEmail: string, userName: string, role: string, action: string, details?: string) {
  try {
    const id = `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await supabase.from('activity_logs').insert({
      id,
      userEmail,
      userName,
      role,
      action,
      details: details || '',
      timestamp: new Date().toISOString()
    });

    // 1 in 10 chance to run log purge to keep database lightweight automatically
    if (Math.random() < 0.1) {
      await supabase.rpc('purge_old_logs').catch(() => {});
    }
  } catch (err) {
    console.warn('Failed to log activity:', err);
  }
}
