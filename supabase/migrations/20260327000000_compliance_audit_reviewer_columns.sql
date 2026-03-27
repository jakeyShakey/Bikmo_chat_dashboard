-- Migration: add human-review columns to compliance_audits
-- All columns are nullable — existing rows remain valid with NULLs.

ALTER TABLE public.compliance_audits
  ADD COLUMN IF NOT EXISTS reviewer_verdict  text
    CHECK (reviewer_verdict IN ('agree', 'disagree')),
  ADD COLUMN IF NOT EXISTS reviewer_notes    text,
  ADD COLUMN IF NOT EXISTS reviewed_by       text,
  ADD COLUMN IF NOT EXISTS reviewed_at       timestamptz;
