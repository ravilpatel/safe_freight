-- SafeFreight OS v4.0.0 — Migration 20261109000002_business_tables_and_audit.sql
-- Description: Core business tables (loads, trips, documents, pings, safety_incidents, security_alerts, audit_log)
-- with mandatory tenant_id, audit columns, strict RLS tenant isolation policies, and append-only audit trigger.

-- 1. Create or ensure loads table
CREATE TABLE IF NOT EXISTS public.loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  shipper_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  origin_name TEXT NOT NULL,
  origin_lat DOUBLE PRECISION,
  origin_lng DOUBLE PRECISION,
  destination_name TEXT NOT NULL,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION,
  weight_kg NUMERIC NOT NULL,
  volume_cft NUMERIC,
  distance_km NUMERIC,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'matched', 'in_transit', 'delivered', 'cancelled')),
  pricing_inr NUMERIC NOT NULL DEFAULT 0,
  matched_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all required columns exist if table was pre-existing
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS shipper_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS origin_name TEXT;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS origin_lat DOUBLE PRECISION;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS origin_lng DOUBLE PRECISION;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS destination_name TEXT;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS volume_cft NUMERIC;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS distance_km NUMERIC;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'posted';
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS pricing_inr NUMERIC DEFAULT 0;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS matched_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.loads ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Create or ensure trips table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  milestone_status TEXT NOT NULL DEFAULT 'created' CHECK (milestone_status IN ('created', 'assigned', 'at_pickup', 'loaded', 'in_transit', 'at_unloading', 'completed', 'cancelled')),
  gross_freight NUMERIC NOT NULL DEFAULT 0,
  total_advances NUMERIC NOT NULL DEFAULT 0,
  maintenance_reserve NUMERIC NOT NULL DEFAULT 0,
  balance_due NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS load_id UUID REFERENCES public.loads(id) ON DELETE SET NULL;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS milestone_status TEXT DEFAULT 'created';
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS gross_freight NUMERIC DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS total_advances NUMERIC DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS maintenance_reserve NUMERIC DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS net_profit NUMERIC DEFAULT 0;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 3. Create or ensure documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vehicle_number TEXT NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('rc', 'fitness', 'insurance', 'puc', 'national_permit', 'driving_license', 'lr_eway_bill', 'other')),
  expiry_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected', 'expired')),
  document_url TEXT,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS vehicle_number TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS doc_type TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_url TEXT;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 4. Create or ensure pings table
CREATE TABLE IF NOT EXISTS public.pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION NOT NULL DEFAULT 0,
  g_force DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  battery_pct NUMERIC,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS speed_kmh DOUBLE PRECISION DEFAULT 0;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS g_force DOUBLE PRECISION DEFAULT 1.0;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS battery_pct NUMERIC;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.pings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 5. Create or ensure safety_incidents table
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  incident_type TEXT NOT NULL CHECK (incident_type IN ('crash', 'sos', 'harsh_braking', 'rollover', 'panic_button', 'geofence_breach')),
  g_force DOUBLE PRECISION,
  t0_timestamp TIMESTAMPTZ,
  t1_timestamp TIMESTAMPTZ,
  t2_timestamp TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'triggered' CHECK (status IN ('triggered', 'cancelled', 'erss_notified', 'resolved')),
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS incident_type TEXT;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS g_force DOUBLE PRECISION;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS t0_timestamp TIMESTAMPTZ;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS t1_timestamp TIMESTAMPTZ;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS t2_timestamp TIMESTAMPTZ;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'triggered';
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.safety_incidents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. Create or ensure security_alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('route_deviation', 'fuel_theft_drop', 'speed_violation', 'unauthorized_stop', 'night_driving')),
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS alert_type TEXT;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'warning';
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS resolved BOOLEAN DEFAULT false;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.security_alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 7. Create append-only audit_log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  row_id UUID,
  action TEXT NOT NULL,
  old_record JSONB,
  new_record JSONB,
  before_state JSONB,
  after_state JSONB,
  performed_by UUID,
  actor_id UUID,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Enable Row-Level Security on all business tables and audit_log
ALTER TABLE public.loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- 9. Tenant Isolation Policies filtering strictly on (auth.jwt() ->> 'tenant_id')::uuid

-- 9.1 loads policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'loads' AND policyname = 'tenant_isolation_loads_select') THEN
    CREATE POLICY tenant_isolation_loads_select ON public.loads
      FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'loads' AND policyname = 'tenant_isolation_loads_insert') THEN
    CREATE POLICY tenant_isolation_loads_insert ON public.loads
      FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'loads' AND policyname = 'tenant_isolation_loads_update') THEN
    CREATE POLICY tenant_isolation_loads_update ON public.loads
      FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'loads' AND policyname = 'tenant_isolation_loads_delete') THEN
    CREATE POLICY tenant_isolation_loads_delete ON public.loads
      FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 9.2 trips policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'tenant_isolation_trips_select') THEN
    CREATE POLICY tenant_isolation_trips_select ON public.trips
      FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'tenant_isolation_trips_insert') THEN
    CREATE POLICY tenant_isolation_trips_insert ON public.trips
      FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'tenant_isolation_trips_update') THEN
    CREATE POLICY tenant_isolation_trips_update ON public.trips
      FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trips' AND policyname = 'tenant_isolation_trips_delete') THEN
    CREATE POLICY tenant_isolation_trips_delete ON public.trips
      FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 9.3 documents policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'tenant_isolation_documents_select') THEN
    CREATE POLICY tenant_isolation_documents_select ON public.documents
      FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'tenant_isolation_documents_insert') THEN
    CREATE POLICY tenant_isolation_documents_insert ON public.documents
      FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'tenant_isolation_documents_update') THEN
    CREATE POLICY tenant_isolation_documents_update ON public.documents
      FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'tenant_isolation_documents_delete') THEN
    CREATE POLICY tenant_isolation_documents_delete ON public.documents
      FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 9.4 pings policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pings' AND policyname = 'tenant_isolation_pings_select') THEN
    CREATE POLICY tenant_isolation_pings_select ON public.pings
      FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pings' AND policyname = 'tenant_isolation_pings_insert') THEN
    CREATE POLICY tenant_isolation_pings_insert ON public.pings
      FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pings' AND policyname = 'tenant_isolation_pings_update') THEN
    CREATE POLICY tenant_isolation_pings_update ON public.pings
      FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pings' AND policyname = 'tenant_isolation_pings_delete') THEN
    CREATE POLICY tenant_isolation_pings_delete ON public.pings
      FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 9.5 safety_incidents policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'safety_incidents' AND policyname = 'tenant_isolation_safety_incidents_select') THEN
    CREATE POLICY tenant_isolation_safety_incidents_select ON public.safety_incidents
      FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'safety_incidents' AND policyname = 'tenant_isolation_safety_incidents_insert') THEN
    CREATE POLICY tenant_isolation_safety_incidents_insert ON public.safety_incidents
      FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'safety_incidents' AND policyname = 'tenant_isolation_safety_incidents_update') THEN
    CREATE POLICY tenant_isolation_safety_incidents_update ON public.safety_incidents
      FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'safety_incidents' AND policyname = 'tenant_isolation_safety_incidents_delete') THEN
    CREATE POLICY tenant_isolation_safety_incidents_delete ON public.safety_incidents
      FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 9.6 security_alerts policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_alerts' AND policyname = 'tenant_isolation_security_alerts_select') THEN
    CREATE POLICY tenant_isolation_security_alerts_select ON public.security_alerts
      FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_alerts' AND policyname = 'tenant_isolation_security_alerts_insert') THEN
    CREATE POLICY tenant_isolation_security_alerts_insert ON public.security_alerts
      FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_alerts' AND policyname = 'tenant_isolation_security_alerts_update') THEN
    CREATE POLICY tenant_isolation_security_alerts_update ON public.security_alerts
      FOR UPDATE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid)
      WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'security_alerts' AND policyname = 'tenant_isolation_security_alerts_delete') THEN
    CREATE POLICY tenant_isolation_security_alerts_delete ON public.security_alerts
      FOR DELETE USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 9.7 audit_log policies (append-only: SELECT and INSERT only, NO UPDATE, NO DELETE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'tenant_isolation_audit_log_select') THEN
    CREATE POLICY tenant_isolation_audit_log_select ON public.audit_log
      FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND policyname = 'tenant_isolation_audit_log_insert') THEN
    CREATE POLICY tenant_isolation_audit_log_insert ON public.audit_log
      FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
  END IF;
END $$;

-- 10. Append-only Audit Log Trigger Function
CREATE OR REPLACE FUNCTION public.record_audit_log_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_actor_id UUID;
  v_record_id UUID;
  v_old_json JSONB := NULL;
  v_new_json JSONB := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_tenant_id := OLD.tenant_id;
    v_old_json := to_jsonb(OLD);
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id;
    v_tenant_id := NEW.tenant_id;
    v_old_json := to_jsonb(OLD);
    v_new_json := to_jsonb(NEW);
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_tenant_id := NEW.tenant_id;
    v_new_json := to_jsonb(NEW);
  END IF;

  -- Extract actor id from Supabase JWT auth context if available
  BEGIN
    v_actor_id := NULLIF(auth.uid(), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_actor_id := NULL;
  END;

  IF v_actor_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      v_actor_id := OLD.updated_by;
    ELSE
      v_actor_id := COALESCE(NEW.updated_by, NEW.created_by);
    END IF;
  END IF;

  INSERT INTO public.audit_log (
    tenant_id,
    table_name,
    record_id,
    row_id,
    action,
    old_record,
    new_record,
    before_state,
    after_state,
    performed_by,
    actor_id,
    created_at,
    updated_at
  ) VALUES (
    v_tenant_id,
    TG_TABLE_NAME,
    v_record_id,
    v_record_id,
    TG_OP,
    v_old_json,
    v_new_json,
    v_old_json,
    v_new_json,
    v_actor_id,
    v_actor_id,
    now(),
    now()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 11. Attach audit triggers to mutating business tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_loads') THEN
    CREATE TRIGGER trg_audit_loads
      AFTER INSERT OR UPDATE OR DELETE ON public.loads
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log_entry();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_trips') THEN
    CREATE TRIGGER trg_audit_trips
      AFTER INSERT OR UPDATE OR DELETE ON public.trips
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log_entry();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_documents') THEN
    CREATE TRIGGER trg_audit_documents
      AFTER INSERT OR UPDATE OR DELETE ON public.documents
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log_entry();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_safety_incidents') THEN
    CREATE TRIGGER trg_audit_safety_incidents
      AFTER INSERT OR UPDATE OR DELETE ON public.safety_incidents
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log_entry();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_security_alerts') THEN
    CREATE TRIGGER trg_audit_security_alerts
      AFTER INSERT OR UPDATE OR DELETE ON public.security_alerts
      FOR EACH ROW EXECUTE FUNCTION public.record_audit_log_entry();
  END IF;
END $$;
