ALTER TABLE public.compliance_audits
  DROP CONSTRAINT IF EXISTS compliance_audits_reviewer_verdict_check;

ALTER TABLE public.compliance_audits
  ADD CONSTRAINT compliance_audits_reviewer_verdict_check
    CHECK (reviewer_verdict IN ('agree', 'disagree', 'flag'));
