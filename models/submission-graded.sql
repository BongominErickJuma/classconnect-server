CREATE OR REPLACE FUNCTION notify_new_assignment()
RETURNS TRIGGER AS $$
DECLARE
  v_course_title TEXT;
  r RECORD;
BEGIN
  SELECT title INTO v_course_title FROM courses WHERE course_id = NEW.course_id;

  FOR r IN (
    SELECT student_id FROM enrollments WHERE course_id = NEW.course_id
  )
  LOOP
    INSERT INTO notifications(user_id, message)
    VALUES (
      r.student_id,
      FORMAT('New assignment posted in "%s": "%s"', v_course_title, NEW.title)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_new_assignment
AFTER INSERT ON assignments
FOR EACH ROW
EXECUTE FUNCTION notify_new_assignment();
