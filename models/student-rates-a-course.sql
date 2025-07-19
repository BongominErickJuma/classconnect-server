CREATE OR REPLACE FUNCTION notify_course_rated()
RETURNS TRIGGER AS $$
DECLARE
  v_instructor_id UUID;
  v_student_name TEXT;
BEGIN
  SELECT instructor_id INTO v_instructor_id FROM courses WHERE course_id = NEW.course_id;
  SELECT name INTO v_student_name FROM users WHERE user_id = NEW.student_id;

  INSERT INTO notifications(user_id, message)
  VALUES (
    v_instructor_id,
    FORMAT('%s has rated your course', v_student_name)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_course_rated
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION notify_course_rated();
