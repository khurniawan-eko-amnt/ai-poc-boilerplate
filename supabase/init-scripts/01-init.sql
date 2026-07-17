-- ============================================================================
-- Supabase Self-Hosted — Database Initialization
-- ============================================================================
-- This runs once when the Postgres container first starts.
-- It creates the required roles, schemas, and extensions for Supabase.
-- ============================================================================

-- ─── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";

-- ─── Roles ─────────────────────────────────────────────────
-- These roles are required by Supabase sub-services.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN CREATEDB CREATEROLE REPLICATION BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOINHERIT;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOINHERIT BYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'dashboard_user') THEN
    CREATE ROLE dashboard_user NOINHERIT;
  END IF;
END
$$;

-- ─── Grant role membership ─────────────────────────────────
GRANT anon TO authenticator;
GRANT authenticated TO authenticator;
GRANT service_role TO authenticator;

-- ─── Auth Schema ───────────────────────────────────────────
-- GoTrue creates its own schema, but we set up the basics.
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS extensions AUTHORIZATION supabase_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_admin;

-- ─── API Schema (for your custom POC tables) ──────────────
CREATE SCHEMA IF NOT EXISTS api AUTHORIZATION supabase_admin;

-- ─── Make extensions available in public ──────────────────
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;

-- ─── Grant schema usage ────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

-- ─── Default privileges ────────────────────────────────────
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA api GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA storage GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- ─── Helper function: current_user_id ──────────────────────
CREATE OR REPLACE FUNCTION api.current_user_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::UUID;
$$;

-- ─── Helper function: current_user_email ───────────────────
CREATE OR REPLACE FUNCTION api.current_user_email()
RETURNS TEXT
LANGUAGE SQL STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.email', true),
    current_setting('request.jwt.claims', true)::json->>'email'
  )::TEXT;
$$;

-- ─── Timestamp trigger ─────────────────────────────────────
CREATE OR REPLACE FUNCTION api.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── Seed demo template: POC App Schemas ──────────────────
-- Each POC app gets its OWN schema. This keeps data isolated
-- while sharing auth (one Supabase, many apps).
--
-- Usage: When you create a new POC app, run:
--   CREATE SCHEMA IF NOT EXISTS poc_your_app_name;
--   GRANT USAGE ON SCHEMA poc_your_app_name TO anon, authenticated, service_role;
--   ALTER DEFAULT PRIVILEGES IN SCHEMA poc_your_app_name
--     GRANT ALL ON TABLES TO anon, authenticated, service_role;
--
-- Then create your tables in that schema.
-- Your React app queries: http://<VM_IP>:8000/rest/v1/your_table
-- with header: Prefer: params=schema=poc_your_app_name
-- ============================================================================