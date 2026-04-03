-- ================================================================
-- Migration: 013_admin_role.sql
-- Purpose:   Add global is_admin flag to users table.
--            Admin operations (listing/approving scorecard uploads)
--            use service_role via createAdminClient(), so no extra
--            RLS policies are needed here — security is enforced by
--            the requireAdmin() check in server actions.
-- ================================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
