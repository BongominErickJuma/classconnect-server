CREATE OR REPLACE FUNCTION notify_submission_graded()
RETURNS TRIGGER AS $$
DECLARE
  v_assignment_title TEXT;
  v_course_title TEXT;
  v_student_id UUID;
  v_max_score NUMERIC;
BEGIN
  SELECT a.title, c.title, s.student_id, COALESCE(a.max_score, 100)
  INTO v_assignment_title, v_course_title, v_student_id, v_max_score
  FROM submissions s
  JOIN assignments a ON s.assignment_id = a.assignment_id
  JOIN courses c ON a.course_id = c.course_id
  WHERE s.submission_id = NEW.submission_id;

  INSERT INTO notifications(user_id, message)
  VALUES (
    v_student_id,
    FORMAT(
      'Your submission for "%s" has been graded. Score: %s/%s',
      v_assignment_title, NEW.score, v_max_score
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_submission_graded
AFTER INSERT ON grades
FOR EACH ROW
EXECUTE FUNCTION notify_submission_graded();
