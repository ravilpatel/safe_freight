-- SafeFreight OS v4.0.0 — Migration 20261109000000_baseline_cleanup.sql
-- Description: Drop insecure v3 prototype policies, clean up legacy structures, and enable required extensions.

-- 1. Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop legacy permissive prototype RLS policies if they exist
DO $$
BEGIN
  -- Drop users legacy policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Allow public read-write on users'
  ) THEN
    DROP POLICY "Allow public read-write on users" ON public.users;
  END IF;

  -- Drop loads legacy policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'loads' AND policyname = 'Allow public read-write on loads'
  ) THEN
    DROP POLICY "Allow public read-write on loads" ON public.loads;
  END IF;

  -- Drop trips legacy policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'Allow public read-write on trips'
  ) THEN
    DROP POLICY "Allow public read-write on trips" ON public.trips;
  END IF;

  -- Drop documents legacy policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Allow public read-write on documents'
  ) THEN
    DROP POLICY "Allow public read-write on documents" ON public.documents;
  END IF;

  -- Drop pings legacy policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pings' AND policyname = 'Allow public read-write on pings'
  ) THEN
    DROP POLICY "Allow public read-write on pings" ON public.pings;
  END IF;

  -- Drop security_alerts legacy policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'security_alerts' AND policyname = 'Allow public read-write on security_alerts'
  ) THEN
    DROP POLICY "Allow public read-write on security_alerts" ON public.security_alerts;
  END IF;

  -- Drop safety_incidents legacy policy
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'safety_incidents' AND policyname = 'Allow public read-write on safety_incidents'
  ) THEN
    DROP POLICY "Allow public read-write on safety_incidents" ON public.safety_incidents;
  END IF;
END $$;

-- 3. Verify Row-Level Security on all existing tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.safety_incidents ENABLE ROW LEVEL SECURITY;
