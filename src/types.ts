export type Role = 'super_admin' | 'owner' | 'staff';

export interface ICalUrls {
  airbnb?: string;
  bookingCom?: string;
  agoda?: string;
  custom?: string;
  lastSyncedAt?: string;
}

export interface Property {
  id: string;
  name: string;
  code: string;
  address: string;
  description: string;
  color: string; // Material Color hex, e.g., #1a73e8, #00897b, #e65100, #8e24aa, #43a047
  imageUrl: string;
  bedrooms: number;
  maxGuests: number;
  icalUrls?: ICalUrls;
  createdAt?: string;
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  telegramChatId?: string;
  role: Role;
  assignedPropertyIds: string[];
  avatarUrl: string;
  status?: 'active' | 'offline';
  password?: string;
  createdAt?: string;
}

export interface Booking {
  id: string;
  propertyId: string;
  propertyName?: string;
  bookingDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  checkinTime: string; // HH:mm
  checkoutTime?: string; // HH:mm
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  paxCount?: number;
  depositAmount?: number;
  depositPaid?: boolean;
  remarks?: string;
  additionalRemarks?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  amount?: number;
  channel?: string; // e.g. Airbnb, Agoda, Booking.com, Direct, Telegram
  externalUid?: string; // iCal UID
  iCalSource?: 'airbnb' | 'booking.com' | 'agoda' | 'custom' | 'manual';
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  createdByRole?: Role;
}

export interface NotificationLog {
  id: string;
  staffId?: string;
  staffName?: string;
  bookingId?: string;
  propertyId?: string;
  propertyName?: string;
  message: string;
  channel: 'telegram' | 'email' | 'fcm_push' | 'in_app' | 'whatsapp';
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
  recipientPhone?: string;
  recipientEmail?: string;
  telegramChatId?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  phoneNumber?: string | null;
  role: Role;
  staffId?: string; // mapped staff ID if user is staff
  assignedPropertyIds: string[];
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda' | 'property_grid';

export interface TelegramConfig {
  botToken: string;
  defaultChatId: string;
  enabled: boolean;
}

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  enabled: boolean;
}

export interface EmailConfig {
  senderEmail: string;
  smtpHost?: string;
  enabled: boolean;
}

export interface ICalSyncLog {
  id: string;
  propertyId: string;
  propertyName: string;
  source: string;
  status: 'success' | 'failed';
  eventsImported: number;
  timestamp: string;
  errorMessage?: string;
}

export interface ActivityLog {
  id: string;
  userEmail: string;
  userName: string;
  role: Role;
  action: string;
  details: string;
  timestamp: string;
}

