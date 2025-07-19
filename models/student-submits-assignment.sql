CREATE OR REPLACE FUNCTION notify_submission_to_instructor()
RETURNS TRIGGER AS $$
DECLARE
  v_instructor_id UUID;
  v_student_name TEXT;
BEGIN
  SELECT c.instructor_id INTO v_instructor_id
  FROM assignments a
  JOIN courses c ON a.course_id = c.course_id
  WHERE a.assignment_id = NEW.assignment_id;

  SELECT name INTO v_student_name FROM users WHERE user_id = NEW.student_id;

  INSERT INTO notifications(user_id, message)
  VALUES (
    v_instructor_id,
    FORMAT('New submission from %s', v_student_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_submission_to_instructor
AFTER INSERT ON submissions
FOR EACH ROW
EXECUTE FUNCTION notify_submission_to_instructor();
