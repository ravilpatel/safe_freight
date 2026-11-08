-- SafeFreight OS v4.0.0 — Migration 20261109000001_multi_tenancy_core.sql
-- Description: Core multi-tenancy schema: organizations, profiles, driver invitations, custom claims token hook, and tenant-isolated RLS policies.

-- 1. Create organizations root table
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('carrier', 'shipper', 'fleet')),
  gstin TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deactivated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create profiles table linked to Supabase auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('fleet_admin', 'shipper', 'driver')),
  full_name TEXT NOT NULL,
  phone TEXT,
  language_preference TEXT NOT NULL DEFAULT 'en' CHECK (language_preference IN ('en', 'hi', 'mr', 'gu', 'ta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create driver_invitations table for invite-based onboarding
CREATE TABLE IF NOT EXISTS public.driver_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'driver' CHECK (role = 'driver'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS) on all 3 tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_invitations ENABLE ROW LEVEL SECURITY;

-- 5. Strict RLS Policies using (auth.jwt() ->> 'tenant_id')::uuid

-- 5.1 Organizations Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'tenant_isolation_org_select'
  ) THEN
    CREATE POLICY tenant_isolation_org_select ON public.organizations
      FOR SELECT
      USING (id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'tenant_isolation_org_update'
  ) THEN
    CREATE POLICY tenant_isolation_org_update ON public.organizations
      FOR UPDATE
      USING (id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') = 'fleet_admin')
      WITH CHECK (id = (auth.jwt() ->> 'tenant_id')::uuid AND (auth.jwt() ->> 'role') = 'fleet_admin');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'tenant_isolation_org_insert'
  ) THEN
    CREATE POLICY tenant_isolation_org_insert ON public.organizations
      FOR INSERT
      WITH CHECK (id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 5.2 Profiles Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'tenant_isolation_profile_select'
  ) THEN
    CREATE POLICY tenant_isolation_profile_select ON public.profiles
      FOR SELECT
      USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'tenant_isolation_profile_update'
  ) THEN
    CREATE POLICY tenant_isolation_profile_update ON public.profiles
      FOR UPDATE
      USING (id = auth.uid() AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (id = auth.uid() AND tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'tenant_isolation_profile_insert'
  ) THEN
    CREATE POLICY tenant_isolation_profile_insert ON public.profiles
      FOR INSERT
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 5.3 Driver Invitations Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'driver_invitations' AND policyname = 'tenant_isolation_invitation_select'
  ) THEN
    CREATE POLICY tenant_isolation_invitation_select ON public.driver_invitations
      FOR SELECT
      USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'driver_invitations' AND policyname = 'tenant_isolation_invitation_insert'
  ) THEN
    CREATE POLICY tenant_isolation_invitation_insert ON public.driver_invitations
      FOR INSERT
      WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND
        (auth.jwt() ->> 'role') = 'fleet_admin'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'driver_invitations' AND policyname = 'tenant_isolation_invitation_update'
  ) THEN
    CREATE POLICY tenant_isolation_invitation_update ON public.driver_invitations
      FOR UPDATE
      USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 6. Custom Access Token Hook Function (Supabase Auth Claims Injection)
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_claims JSONB;
  user_role TEXT;
  user_tenant_id UUID;
BEGIN
  -- Fetch role and tenant_id from profiles for the authenticated user
  SELECT role, tenant_id INTO user_role, user_tenant_id
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  user_claims := COALESCE(event->'claims', '{}'::jsonb);

  IF user_role IS NOT NULL THEN
    user_claims := jsonb_set(user_claims, '{user_role}', to_jsonb(user_role));
    user_claims := jsonb_set(user_claims, '{role}', to_jsonb(user_role));
  END IF;

  IF user_tenant_id IS NOT NULL THEN
    user_claims := jsonb_set(user_claims, '{tenant_id}', to_jsonb(user_tenant_id::text));
  END IF;

  RETURN jsonb_set(event, '{claims}', user_claims);
END;
$$;
