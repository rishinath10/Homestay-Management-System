import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  setDoc, 
  getDocs, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  enableIndexedDbPersistence,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  User,
  signInAnonymously,
  setPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Property, Staff, Booking, NotificationLog } from '../types';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get Firestore instance with standard or named DB ID
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence).catch((err) => {
  console.warn('Auth persistence configuration failed:', err);
});
export const googleProvider = new GoogleAuthProvider();

// Enable offline persistence for web
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence is not supported by browser');
    }
  });
} catch (e) {
  console.log('Persistence initialization skipped or active');
}

// Default Seed Data
export const DEFAULT_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    name: 'Birds Nest',
    code: 'PD-BN',
    address: 'Batu 8, Jalan Pantai, Teluk Kemang, 71050 Port Dickson',
    description: 'Luxury treetop sanctuary villa with private plunge pool and garden deck.',
    color: '#1a73e8', // Google Blue
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
    color: '#00897b', // Google Teal
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
    color: '#e65100', // Google Amber/Orange
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
    color: '#8e24aa', // Google Purple
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
    color: '#43a047', // Google Emerald
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
    assignedPropertyIds: ['prop-1', 'prop-2'], // Birds Nest & Nuri
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    status: 'active',
    password: 'sue123'
  },
  {
    id: 'staff-2',
    name: 'Yati',
    email: 'noorhayatiariffin18@gmail.com',
    phone: '+60198765432',
    telegramChatId: '@yati_pdvillas',
    role: 'staff',
    assignedPropertyIds: ['prop-3', 'prop-4', 'prop-5'], // The Bay, Bella Vista, Sounds of the Sea
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    status: 'active',
    password: 'yati123'
  }
];

// Helper to seed initial data into Firestore if empty
export async function seedInitialFirestoreData() {
  try {
    // Check if system has already been seeded or cleared intentionally
    const configRef = doc(db, 'settings', 'system_config');
    const configSnap = await getDoc(configRef);
    if (configSnap.exists() && configSnap.data()?.seeded) {
      console.log('System already initialized or cleared. Skipping auto-seed.');
      return;
    }

    // Seed or update settings/auth_config
    await setDoc(doc(db, 'settings', 'auth_config'), {
      superAdminEmail: 'rishinathsai@gmail.com',
      superAdminPassword: 'admin123',
      ownerEmail: 'pdholidayvillas@gmail.com',
      ownerPassword: 'jeff123',
      ownerName: 'Jeff'
    }, { merge: true });

    // Seed or update properties to ensure exact names match requested staff mapping
    for (const p of DEFAULT_PROPERTIES) {
      await setDoc(doc(db, 'properties', p.id), p, { merge: true });
    }

    // Seed or update staff assignments
    for (const s of DEFAULT_STAFF) {
      const staffDocRef = doc(db, 'staff', s.id);
      const staffSnap = await getDoc(staffDocRef);
      if (!staffSnap.exists()) {
        await setDoc(staffDocRef, s);
      }
    }

    const bookingSnap = await getDocs(collection(db, 'bookings'));
    if (bookingSnap.empty) {
      console.log('Seeding sample bookings for current month...');
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');

      const sampleBookings: Booking[] = [
        {
          id: 'bk-101',
          propertyId: 'prop-1',
          propertyName: 'Birds Nest',
          bookingDate: `${year}-${month}-05`,
          endDate: `${year}-${month}-07`,
          checkinTime: '15:00',
          checkoutTime: '12:00',
          guestName: 'Tan Sri Jeffrey Cheah',
          guestPhone: '+60129991122',
          guestEmail: 'jeffrey@sunway.my',
          paxCount: 10,
          depositAmount: 300,
          depositPaid: true,
          remarks: 'VIP guest. Extra towels and pool setup required.',
          additionalRemarks: 'Early check-in requested at 1:00 PM if clean.',
          assignedStaffId: 'staff-1',
          assignedStaffName: 'Sue',
          status: 'confirmed',
          amount: 1800,
          channel: 'Direct',
          createdBy: 'admin@pdvillas.com',
          createdByRole: 'super_admin'
        },
        {
          id: 'bk-102',
          propertyId: 'prop-2',
          propertyName: 'Nuri',
          bookingDate: `${year}-${month}-12`,
          endDate: `${year}-${month}-14`,
          checkinTime: '14:00',
          checkoutTime: '11:00',
          guestName: 'Lim Chong Wei',
          guestPhone: '+601133445566',
          guestEmail: 'cw.lim@gmail.com',
          paxCount: 8,
          depositAmount: 200,
          depositPaid: true,
          remarks: 'Family gathering with kids. Requested BBQ set up.',
          additionalRemarks: 'Need 2 extra floor mattresses.',
          assignedStaffId: 'staff-1',
          assignedStaffName: 'Sue',
          status: 'confirmed',
          amount: 1350,
          channel: 'Airbnb',
          createdBy: 'admin@pdvillas.com',
          createdByRole: 'super_admin'
        },
        {
          id: 'bk-103',
          propertyId: 'prop-3',
          propertyName: 'The Bay',
          bookingDate: `${year}-${month}-18`,
          endDate: `${year}-${month}-20`,
          checkinTime: '15:00',
          checkoutTime: '12:00',
          guestName: 'Muhammad Faiz',
          guestPhone: '+60182233445',
          guestEmail: 'faiz.m@yahoo.com',
          paxCount: 14,
          depositAmount: 500,
          depositPaid: false,
          remarks: 'Reunion group. Require karaoke set ready.',
          additionalRemarks: 'Deposit pending bank transfer verification.',
          assignedStaffId: 'staff-2',
          assignedStaffName: 'Yati',
          status: 'confirmed',
          amount: 2100,
          channel: 'Booking.com',
          createdBy: 'admin@pdvillas.com',
          createdByRole: 'super_admin'
        },
        {
          id: 'bk-104',
          propertyId: 'prop-4',
          propertyName: 'Bella Vista',
          bookingDate: `${year}-${month}-22`,
          endDate: `${year}-${month}-23`,
          checkinTime: '15:00',
          checkoutTime: '12:00',
          guestName: 'Kavitha Rajan',
          guestPhone: '+60167788990',
          guestEmail: 'kavitha.r@hotmail.com',
          paxCount: 6,
          depositAmount: 200,
          depositPaid: true,
          remarks: 'Anniversary stay.',
          additionalRemarks: 'Flower arrangement on master bed requested.',
          assignedStaffId: 'staff-2',
          assignedStaffName: 'Yati',
          status: 'confirmed',
          amount: 950,
          channel: 'Agoda',
          createdBy: 'admin@pdvillas.com',
          createdByRole: 'super_admin'
        },
        {
          id: 'bk-105',
          propertyId: 'prop-5',
          propertyName: 'Sounds of the Sea',
          bookingDate: `${year}-${month}-25`,
          endDate: `${year}-${month}-27`,
          checkinTime: '14:00',
          checkoutTime: '12:00',
          guestName: 'Farah Ann Abdul',
          guestPhone: '+60134455667',
          guestEmail: 'farah.ann@gmail.com',
          paxCount: 6,
          depositAmount: 150,
          depositPaid: true,
          remarks: 'Weekend beach stay.',
          additionalRemarks: 'Late check-out requested at 2 PM if possible.',
          assignedStaffId: 'staff-2',
          assignedStaffName: 'Yati',
          status: 'confirmed',
          amount: 880,
          channel: 'Direct',
          createdBy: 'admin@pdvillas.com',
          createdByRole: 'super_admin'
        }
      ];

      for (const b of sampleBookings) {
        await setDoc(doc(db, 'bookings', b.id), b);
      }
    }

    // Mark system as seeded so we don't overwrite user changes
    await setDoc(doc(db, 'settings', 'system_config'), { seeded: true });
  } catch (err) {
    console.warn('Data seeding error:', err);
  }
}

// Clear all database collections to reset system
export async function clearAllDatabaseCollections() {
  const collectionsToClear = ['properties', 'staff', 'bookings', 'notifications', 'activity_logs'];
  for (const collName of collectionsToClear) {
    try {
      const snap = await getDocs(collection(db, collName));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, collName, d.id));
      }
    } catch (err) {
      console.warn(`Failed to clear collection ${collName}:`, err);
    }
  }
  // Ensure we mark it as seeded (cleared) so it doesn't auto-seed default data
  await setDoc(doc(db, 'settings', 'system_config'), { seeded: true });
}

// Reset seeding config to allow rebuilding demo data
export async function resetSystemConfig() {
  await setDoc(doc(db, 'settings', 'system_config'), { seeded: false });
}

// Activity Logging Helper
export async function logActivity(userEmail: string, userName: string, role: string, action: string, details?: string) {
  try {
    const id = `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await setDoc(doc(db, 'activity_logs', id), {
      id,
      userEmail,
      userName,
      role,
      action,
      details: details || '',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Failed to log activity:', err);
  }
}
