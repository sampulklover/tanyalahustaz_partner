-- RLS policies copied from cloud Supabase.
-- Run on any fresh environment (local now, DigitalOcean later) after
-- migrations have created the tables. Idempotent: drops then recreates.

DROP POLICY IF EXISTS "Knowledge team can view ai settings" ON public.ai_settings;
CREATE POLICY "Knowledge team can view ai settings" ON public.ai_settings
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Users can create own api keys" ON public.api_keys;
CREATE POLICY "Users can create own api keys" ON public.api_keys
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can update own api keys" ON public.api_keys;
CREATE POLICY "Users can update own api keys" ON public.api_keys
  FOR UPDATE
  TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view own api keys" ON public.api_keys;
CREATE POLICY "Users can view own api keys" ON public.api_keys
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Knowledge team can view billing settings" ON public.billing_settings;
CREATE POLICY "Knowledge team can view billing settings" ON public.billing_settings
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Users can view own billing transactions" ON public.billing_transactions;
CREATE POLICY "Users can view own billing transactions" ON public.billing_transactions
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Users can view own credit ledger" ON public.credit_ledger;
CREATE POLICY "Users can view own credit ledger" ON public.credit_ledger
  FOR SELECT
  TO public
  USING ((auth.uid() = user_id));

DROP POLICY IF EXISTS "Knowledge editors can delete articles" ON public.knowledge_articles;
CREATE POLICY "Knowledge editors can delete articles" ON public.knowledge_articles
  FOR DELETE
  TO public
  USING (can_edit_knowledge());

DROP POLICY IF EXISTS "Knowledge editors can insert articles" ON public.knowledge_articles;
CREATE POLICY "Knowledge editors can insert articles" ON public.knowledge_articles
  FOR INSERT
  TO public
  WITH CHECK (can_edit_knowledge());

DROP POLICY IF EXISTS "Knowledge editors can update articles" ON public.knowledge_articles;
CREATE POLICY "Knowledge editors can update articles" ON public.knowledge_articles
  FOR UPDATE
  TO public
  USING (can_edit_knowledge());

DROP POLICY IF EXISTS "Knowledge team can view all articles" ON public.knowledge_articles;
CREATE POLICY "Knowledge team can view all articles" ON public.knowledge_articles
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Knowledge team can read all chunks" ON public.knowledge_chunks;
CREATE POLICY "Knowledge team can read all chunks" ON public.knowledge_chunks
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Knowledge team can view embed jobs" ON public.knowledge_embed_jobs;
CREATE POLICY "Knowledge team can view embed jobs" ON public.knowledge_embed_jobs
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Knowledge team can read OCR runs" ON public.knowledge_ocr_runs;
CREATE POLICY "Knowledge team can read OCR runs" ON public.knowledge_ocr_runs
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Knowledge team can view source selections" ON public.knowledge_source_selections;
CREATE POLICY "Knowledge team can view source selections" ON public.knowledge_source_selections
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Knowledge team can view sync runs" ON public.knowledge_sync_runs;
CREATE POLICY "Knowledge team can view sync runs" ON public.knowledge_sync_runs
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Knowledge team can view sync settings" ON public.knowledge_sync_settings;
CREATE POLICY "Knowledge team can view sync settings" ON public.knowledge_sync_settings
  FOR SELECT
  TO public
  USING (can_view_knowledge_workspace());

DROP POLICY IF EXISTS "Knowledge admins can add team members" ON public.knowledge_team_members;
CREATE POLICY "Knowledge admins can add team members" ON public.knowledge_team_members
  FOR INSERT
  TO public
  WITH CHECK (can_manage_knowledge_team());

DROP POLICY IF EXISTS "Knowledge admins can remove team members" ON public.knowledge_team_members;
CREATE POLICY "Knowledge admins can remove team members" ON public.knowledge_team_members
  FOR DELETE
  TO public
  USING (can_manage_knowledge_team());

DROP POLICY IF EXISTS "Knowledge admins can update team members" ON public.knowledge_team_members;
CREATE POLICY "Knowledge admins can update team members" ON public.knowledge_team_members
  FOR UPDATE
  TO public
  USING (can_manage_knowledge_team());

DROP POLICY IF EXISTS "Knowledge admins can view all team members" ON public.knowledge_team_members;
CREATE POLICY "Knowledge admins can view all team members" ON public.knowledge_team_members
  FOR SELECT
  TO public
  USING (can_manage_knowledge_team());

DROP POLICY IF EXISTS "Knowledge team can view own membership" ON public.knowledge_team_members;
CREATE POLICY "Knowledge team can view own membership" ON public.knowledge_team_members
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

DROP POLICY IF EXISTS "Partners can view own chat logs" ON public.partner_chat_logs;
CREATE POLICY "Partners can view own chat logs" ON public.partner_chat_logs
  FOR SELECT
  TO public
  USING ((auth.uid() = partner_id));

DROP POLICY IF EXISTS "Partners can view own knowledge chunks" ON public.partner_knowledge_chunks;
CREATE POLICY "Partners can view own knowledge chunks" ON public.partner_knowledge_chunks
  FOR SELECT
  TO public
  USING ((auth.uid() = partner_id));

DROP POLICY IF EXISTS "Partners can delete own knowledge files" ON public.partner_knowledge_files;
CREATE POLICY "Partners can delete own knowledge files" ON public.partner_knowledge_files
  FOR DELETE
  TO public
  USING ((auth.uid() = partner_id));

DROP POLICY IF EXISTS "Partners can insert own knowledge files" ON public.partner_knowledge_files;
CREATE POLICY "Partners can insert own knowledge files" ON public.partner_knowledge_files
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() = partner_id));

DROP POLICY IF EXISTS "Partners can view own knowledge files" ON public.partner_knowledge_files;
CREATE POLICY "Partners can view own knowledge files" ON public.partner_knowledge_files
  FOR SELECT
  TO public
  USING ((auth.uid() = partner_id));

DROP POLICY IF EXISTS "Knowledge admins can view profiles for team management" ON public.profiles;
CREATE POLICY "Knowledge admins can view profiles for team management" ON public.profiles
  FOR SELECT
  TO public
  USING (can_manage_knowledge_team());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO public
  USING ((auth.uid() = id));

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT
  TO public
  USING ((auth.uid() = id));

DROP POLICY IF EXISTS "Users can view usage for own keys" ON public.api_usage;
CREATE POLICY "Users can view usage for own keys" ON public.api_usage
  FOR SELECT
  TO public
  USING (EXISTS (
    SELECT 1 FROM api_keys
    WHERE api_keys.id = api_usage.api_key_id
      AND api_keys.user_id = auth.uid()
  ));
