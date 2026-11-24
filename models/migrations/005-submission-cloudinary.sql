ALTER TABLE submission_files
  ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT,
  ALTER COLUMN contents DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submission_files_cloudinary_public_id
  ON submission_files(cloudinary_public_id) WHERE cloudinary_public_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid = 'submission_files'::regclass AND conname = 'submission_files_one_storage_location') THEN
    ALTER TABLE submission_files ADD CONSTRAINT submission_files_one_storage_location
      CHECK ((contents IS NULL) <> (cloudinary_public_id IS NULL));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS submission_cloudinary_cleanup (
  public_id TEXT PRIMARY KEY,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_attempt_at TIMESTAMPTZ
);

CREATE OR REPLACE FUNCTION queue_submission_cloudinary_cleanup()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.cloudinary_public_id IS NULL THEN RETURN NULL; END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.cloudinary_public_id IS NOT DISTINCT FROM NEW.cloudinary_public_id THEN RETURN NULL; END IF;
  END IF;
  INSERT INTO submission_cloudinary_cleanup (public_id) VALUES (OLD.cloudinary_public_id)
    ON CONFLICT DO NOTHING;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_submission_cloudinary_cleanup ON submission_files;
CREATE TRIGGER trigger_submission_cloudinary_cleanup
  AFTER DELETE OR UPDATE OF cloudinary_public_id ON submission_files
  FOR EACH ROW EXECUTE FUNCTION queue_submission_cloudinary_cleanup();
