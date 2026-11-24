ALTER TABLE ratings
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE courses ALTER COLUMN rating DROP DEFAULT;

CREATE INDEX IF NOT EXISTS idx_ratings_course_visibility
  ON ratings (course_id, is_hidden, created_at DESC, rating_id DESC);

CREATE OR REPLACE VIEW course_review_entries AS
SELECT r.rating_id, r.course_id, r.student_id, r.rating, r.review, r.created_at, r.updated_at,
       r.is_hidden, u.name, u.profile_photo, c.title, c.instructor_id
FROM ratings r JOIN users u ON u.user_id = r.student_id
JOIN courses c ON c.course_id = r.course_id
WHERE c.is_deleted IS NOT TRUE AND u.is_deleted IS NOT TRUE;

CREATE OR REPLACE VIEW course_review_summaries AS
SELECT course_id, ROUND(AVG(rating), 2) AS rating, COUNT(*)::int AS review_count
FROM course_review_entries WHERE is_hidden IS FALSE GROUP BY course_id;

CREATE OR REPLACE VIEW courses_with_reviews AS
SELECT c.course_id, c.title, c.description, c.instructor_id, c.cover_image,
       s.rating, c.is_deleted, c.created_at, c.updated_at, COALESCE(s.review_count, 0) AS review_count
FROM courses c LEFT JOIN course_review_summaries s USING (course_id);

CREATE OR REPLACE FUNCTION notify_course_rated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (user_id, message)
  SELECT c.instructor_id, format('%s reviewed your course "%s".', student.name, c.title)
  FROM courses c JOIN users instructor ON instructor.user_id = c.instructor_id
  JOIN users student ON student.user_id = NEW.student_id
  WHERE c.course_id = NEW.course_id AND c.is_deleted IS NOT TRUE
    AND instructor.is_deleted IS NOT TRUE AND NEW.is_hidden IS FALSE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_course_rated ON ratings;
CREATE TRIGGER trigger_notify_course_rated AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION notify_course_rated();

DO $$
DECLARE constraint_name TEXT;
BEGIN
  FOR constraint_name IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'ratings'::regclass AND confrelid = 'courses'::regclass
      AND contype = 'f' AND confdeltype <> 'c'
  LOOP
    EXECUTE format('ALTER TABLE ratings DROP CONSTRAINT %I', constraint_name);
    EXECUTE format('ALTER TABLE ratings ADD CONSTRAINT %I FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE', constraint_name);
  END LOOP;
END;
$$;
