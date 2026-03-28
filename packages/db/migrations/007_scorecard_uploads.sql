-- ================================================================
-- Migration: 007_scorecard_uploads.sql
-- Purpose:   Scorecard photo upload → OCR pipeline.
--            Players photograph a physical scorecard; Claude Vision
--            extracts course/hole/tee data. Data is "pending" until
--            an admin approves it, at which point it becomes a
--            permanent course record.
-- ================================================================

-- ── Scorecard uploads (one row per photo submission) ─────────────
CREATE TABLE IF NOT EXISTS public.scorecard_uploads (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  uploaded_by     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  image_url       text        NOT NULL,

  -- User-supplied context (sanitised before storage, never in prompts)
  course_name     text,
  country         text,
  continent       text,

  -- Claude Vision extraction result (JSONB blob)
  extracted_data  jsonb,

  -- Approval workflow
  status          text        NOT NULL DEFAULT 'pending'
                  CHECK (status = ANY (ARRAY['pending','approved','rejected'])),
  reviewed_by     uuid        REFERENCES public.users(id),
  reviewed_at     timestamptz,
  review_notes    text,

  -- Links to created course records (set on approval)
  course_id       uuid        REFERENCES public.courses(id) ON DELETE SET NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS scorecard_uploads_status_idx
  ON public.scorecard_uploads (status);
CREATE INDEX IF NOT EXISTS scorecard_uploads_uploaded_by_idx
  ON public.scorecard_uploads (uploaded_by);

ALTER TABLE public.scorecard_uploads ENABLE ROW LEVEL SECURITY;

-- RLS: users can read their own uploads; admins can read all
CREATE POLICY "Users can view own uploads"
  ON public.scorecard_uploads FOR SELECT
  USING (uploaded_by = auth.uid());

CREATE POLICY "Users can insert own uploads"
  ON public.scorecard_uploads FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

-- ── Add submitted_by to courses for tracking who added it ────────
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES public.users(id),
  ADD COLUMN IF NOT EXISTS country      text,
  ADD COLUMN IF NOT EXISTS continent    text;
