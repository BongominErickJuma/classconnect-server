CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_deleted IS NOT TRUE THEN
    INSERT INTO notifications (user_id, message)
    SELECT DISTINCT e.student_id, format('New assignment in "%s": %s', c.title, NEW.title)
    FROM enrollments e JOIN courses c ON c.course_id = e.course_id
    JOIN users student ON student.user_id = e.student_id AND student.is_deleted IS NOT TRUE
    WHERE e.course_id = NEW.course_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_submission_to_instructor()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  action TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.submitted_at IS NOT DISTINCT FROM OLD.submitted_at THEN RETURN NEW; END IF;
    action := 'Updated submission';
  ELSE
    action := 'New submission';
  END IF;
  INSERT INTO notifications (user_id, message)
  SELECT c.instructor_id, format('%s from %s for "%s".', action, student.name, a.title)
  FROM assignments a JOIN courses c ON c.course_id = a.course_id
  JOIN users student ON student.user_id = NEW.student_id
  WHERE a.assignment_id = NEW.assignment_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.score IS NOT DISTINCT FROM OLD.score AND NEW.feedback IS NOT DISTINCT FROM OLD.feedback THEN RETURN NEW; END IF;
  END IF;
  INSERT INTO notifications (user_id, message)
  SELECT s.student_id, format('Your grade for "%s" is available: %s/%s points.', a.title, NEW.score, COALESCE(a.max_score, 100))
  FROM submissions s JOIN assignments a ON a.assignment_id = s.assignment_id
  WHERE s.submission_id = NEW.submission_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_new_assignment ON assignments;
CREATE TRIGGER trigger_notify_new_assignment AFTER INSERT ON assignments
  FOR EACH ROW EXECUTE FUNCTION notify_new_assignment();

DROP TRIGGER IF EXISTS trigger_notify_submission_to_instructor ON submissions;
CREATE TRIGGER trigger_notify_submission_to_instructor AFTER INSERT OR UPDATE OF submitted_at ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_submission_to_instructor();

DROP TRIGGER IF EXISTS trigger_notify_submission_graded ON grades;
CREATE TRIGGER trigger_notify_submission_graded AFTER INSERT OR UPDATE OF score, feedback ON grades
  FOR EACH ROW EXECUTE FUNCTION notify_submission_graded();
