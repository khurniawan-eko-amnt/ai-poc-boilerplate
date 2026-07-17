-- ============================================================================
-- POC App Schema Template
-- ============================================================================
-- Use this template when creating a new POC application.
-- Each POC app gets its OWN Postgres schema for data isolation.
-- Auth is shared (one Supabase, many apps).
--
-- Usage:
--   1. Replace "poc_your_app" with your app's schema name
--   2. Add your app-specific tables after the setup block
--   3. Run this SQL in Supabase Studio (http://<VM_IP>:3001) SQL editor
--      or via psql: docker exec -i supabase-db psql -U postgres < this_file
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 1: Create schema for your POC app
-- ═══════════════════════════════════════════════════════════════════════════

-- Replace 'poc_your_app' with your app's schema name (e.g., poc_chatbot, poc_rag, poc_inspection)
CREATE SCHEMA IF NOT EXISTS poc_your_app AUTHORIZATION postgres;

-- Grant access to Supabase roles
GRANT USAGE ON SCHEMA poc_your_app TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA poc_your_app
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA poc_your_app
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA poc_your_app
  GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 2: Enable PostgREST access to the schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Add 'poc_your_app' to PGRST_DB_SCHEMAS in supabase/.env:
--   PGRST_DB_SCHEMAS=public,storage,graphql_public,poc_your_app
-- Then restart: docker compose restart rest
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 3: Example tables — REPLACE these with your own tables
-- ═══════════════════════════════════════════════════════════════════════════

-- Set the search path for the session
SET search_path TO poc_your_app;

-- Example: Chat sessions table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'New Chat',
  model TEXT DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Example: Chat messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Example: File uploads table (metadata for Supabase Storage)
CREATE TABLE IF NOT EXISTS uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 4: Row Level Security (RLS) — users only see their own data
-- ═══════════════════════════════════════════════════════════════════════════

-- Chats
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own chats" ON chats
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own messages" ON messages
  FOR ALL
  USING (
    auth.uid() = (SELECT user_id FROM chats WHERE id = chat_id)
  )
  WITH CHECK (
    auth.uid() = (SELECT user_id FROM chats WHERE id = chat_id)
  );

-- Uploads
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own uploads" ON uploads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 5: Indexes for performance
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_updated_at ON chats(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_uploads_user_id ON uploads(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- STEP 6: Updated-at trigger
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! Your schema is ready.
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Next steps:
--   1. Add poc_your_app to PGRST_DB_SCHEMAS in .env and restart
--   2. Create a Supabase Storage bucket: your-app-files
--   3. Connect from your React app via @supabase/supabase-js
--
-- Example React query:
--   const { data } = await supabase
--     .from('chats')
--     .select('*')
--     .order('updated_at', { ascending: false });
--
-- The schema prefix is auto-handled by PostgREST.
-- ============================================================================