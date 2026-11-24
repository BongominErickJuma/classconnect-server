ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

UPDATE submissions SET submitted_at = COALESCE(created_at, NOW()) WHERE submitted_at IS NULL;
ALTER TABLE submissions ALTER COLUMN submitted_at SET DEFAULT NOW(), ALTER COLUMN submitted_at SET NOT NULL;

ALTER TABLE grades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE grades SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;
ALTER TABLE grades ALTER COLUMN updated_at SET DEFAULT NOW(), ALTER COLUMN updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS submission_files (
  submission_id UUID PRIMARY KEY REFERENCES submissions(submission_id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  contents BYTEA NOT NULL CHECK (octet_length(contents) BETWEEN 1 AND 10485760)
);

DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'submissions'::regclass AND confrelid = 'assignments'::regclass
      AND contype = 'f' AND confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE submissions DROP CONSTRAINT %I', constraint_name);
    EXECUTE format('ALTER TABLE submissions ADD CONSTRAINT %I FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE', constraint_name);
  END LOOP;
  FOR constraint_name IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'grades'::regclass AND confrelid = 'submissions'::regclass
      AND contype = 'f' AND confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE grades DROP CONSTRAINT %I', constraint_name);
    EXECUTE format('ALTER TABLE grades ADD CONSTRAINT %I FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE', constraint_name);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION guard_graded_submission_replacement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM grades WHERE submission_id = OLD.submission_id) THEN
    RAISE EXCEPTION 'Graded submissions cannot be replaced.'
      USING ERRCODE = '23514', CONSTRAINT = 'protect_graded_submission';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_graded_submission_replacement ON submissions;
CREATE TRIGGER trigger_guard_graded_submission_replacement BEFORE UPDATE OF submitted_at ON submissions
  FOR EACH ROW WHEN (OLD.submitted_at IS DISTINCT FROM NEW.submitted_at)
  EXECUTE FUNCTION guard_graded_submission_replacement();

CREATE OR REPLACE FUNCTION guard_assignment_maximum()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM grades g JOIN submissions s ON s.submission_id = g.submission_id
    WHERE s.assignment_id = OLD.assignment_id AND g.score > COALESCE(NEW.max_score, 100)) THEN
    RAISE EXCEPTION 'The maximum score cannot be below an existing grade.'
      USING ERRCODE = '23514', CONSTRAINT = 'protect_assignment_max_score';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_assignment_maximum ON assignments;
CREATE TRIGGER trigger_guard_assignment_maximum BEFORE UPDATE OF max_score ON assignments
  FOR EACH ROW WHEN (OLD.max_score IS DISTINCT FROM NEW.max_score)
  EXECUTE FUNCTION guard_assignment_maximum();
