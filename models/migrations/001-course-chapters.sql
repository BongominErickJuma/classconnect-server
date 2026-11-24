CREATE TABLE IF NOT EXISTS course_chapters (
  chapter_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  position BIGINT GENERATED ALWAYS AS IDENTITY,
  UNIQUE (course_id, chapter_id)
);

ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS link TEXT,
  ADD COLUMN IF NOT EXISTS chapter_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'resources'::regclass
      AND conname = 'resources_course_chapter_fkey'
  ) THEN
    ALTER TABLE resources ADD CONSTRAINT resources_course_chapter_fkey
      FOREIGN KEY (course_id, chapter_id)
      REFERENCES course_chapters(course_id, chapter_id);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_course_chapters_order
  ON course_chapters(course_id, position);
