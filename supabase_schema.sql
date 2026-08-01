-- ========================================================
-- SUPABASE SCHEMA SETUP FOR PD HOLIDAY VILLAS BOOKING SYSTEM
-- Copy and paste this script into your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/tcwrtxizwnbnttukfrir/sql/new)
-- ========================================================

-- 1. Create properties table
CREATE TABLE IF NOT EXISTS public.properties (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  description TEXT,
  color TEXT,
  "imageUrl" TEXT,
  bedrooms INT,
  "maxGuests" INT,
  "icalUrls" JSONB,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create staff table
CREATE TABLE IF NOT EXISTS public.staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  "telegramChatId" TEXT,
  role TEXT DEFAULT 'staff',
  "assignedPropertyIds" JSONB,
  "avatarUrl" TEXT,
  status TEXT DEFAULT 'active',
  password TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL,
  "propertyName" TEXT,
  "bookingDate" TEXT NOT NULL,
  "endDate" TEXT,
  "checkinTime" TEXT,
  "checkoutTime" TEXT,
  "guestName" TEXT,
  "guestPhone" TEXT,
  "guestEmail" TEXT,
  "paxCount" INT,
  "depositAmount" NUMERIC,
  "depositPaid" BOOLEAN DEFAULT FALSE,
  remarks TEXT,
  "additionalRemarks" TEXT,
  "assignedStaffId" TEXT,
  "assignedStaffName" TEXT,
  status TEXT DEFAULT 'confirmed',
  amount NUMERIC,
  channel TEXT,
  "externalUid" TEXT,
  "iCalSource" TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "createdBy" TEXT,
  "createdByRole" TEXT
);

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  "staffId" TEXT,
  "staffName" TEXT,
  "bookingId" TEXT,
  "propertyId" TEXT,
  "propertyName" TEXT,
  message TEXT,
  channel TEXT,
  status TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  "recipientPhone" TEXT,
  "recipientEmail" TEXT,
  "telegramChatId" TEXT,
  title TEXT,
  type TEXT
);

-- 5. Create activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id TEXT PRIMARY KEY,
  "userEmail" TEXT,
  "userName" TEXT,
  role TEXT,
  action TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create villa_memos table
CREATE TABLE IF NOT EXISTS public.villa_memos (
  id TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL,
  "propertyName" TEXT,
  title TEXT,
  "wifiName" TEXT,
  "wifiPassword" TEXT,
  "netflixAccount" TEXT,
  "netflixPassword" TEXT,
  "gateCode" TEXT,
  "lockboxCode" TEXT,
  notes TEXT,
  "updatedAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedBy" TEXT
);

-- 7. Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
  id TEXT PRIMARY KEY,
  "superAdminEmail" TEXT,
  "superAdminPassword" TEXT,
  "ownerEmail" TEXT,
  "ownerPassword" TEXT,
  "ownerName" TEXT,
  seeded BOOLEAN DEFAULT FALSE
);

-- Disable Row Level Security (RLS) so web clients can access tables without custom RLS policy blocks
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.villa_memos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated web clients
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Enable Realtime publication for instant cross-device synchronization
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'bookings') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'properties') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'staff') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.staff;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'villa_memos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.villa_memos;
  END IF;
END $$;
