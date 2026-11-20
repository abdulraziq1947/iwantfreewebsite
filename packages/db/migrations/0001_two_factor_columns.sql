-- No-op: verified, failed_verification_count, and locked_until are already
-- created on two_factor in 0000_phase1.sql. This file is retained so the
-- migration journal entry 0001_two_factor_columns remains valid for all envs.
SELECT 1;
