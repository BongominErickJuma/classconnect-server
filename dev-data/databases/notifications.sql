-- System-wide notifications for all users
INSERT INTO notifications (user_id, message, read)
SELECT 
    user_id,
    'Welcome to ElassLink! Get started by exploring your courses.',
    FALSE
FROM users;

-- Course enrollment notifications
INSERT INTO notifications (user_id, message, read, created_at)
SELECT 
    e.student_id,
    'You have been enrolled in "' || c.title || '"',
    FALSE,
    e.enrolled_at
FROM enrollments e
JOIN courses c ON e.course_id = c.course_id;

-- Assignment deadline reminders (for students)
INSERT INTO notifications (user_id, message, read, created_at)
SELECT 
    e.student_id,
    'Reminder: "' || a.title || '" is due ' || 
    TO_CHAR(a.due_date, 'FMDay, Month DD') || 
    CASE 
        WHEN a.due_date > CURRENT_TIMESTAMP THEN 
            ' (' || EXTRACT(DAY FROM a.due_date - CURRENT_TIMESTAMP) || ' days remaining)'
        ELSE
            ' (due date passed)'
    END,
    FALSE,
    CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM enrollments e
JOIN assignments a ON e.course_id = a.course_id
JOIN users u ON e.student_id = u.user_id
WHERE u.role = 'student';

-- New assignment notifications (for students)
INSERT INTO notifications (user_id, message, read, created_at)
SELECT 
    e.student_id,
    'New assignment posted in "' || c.title || '": "' || a.title || '"',
    FALSE,
    a.created_at + INTERVAL '1 hour'
FROM enrollments e
JOIN courses c ON e.course_id = c.course_id
JOIN assignments a ON c.course_id = a.course_id
JOIN users u ON e.student_id = u.user_id
WHERE u.role = 'student';

-- Grade notifications (for students)
INSERT INTO notifications (user_id, message, read, created_at)
SELECT 
    s.student_id,
    'Your submission for "' || a.title || '" has been graded. Score: ' || g.score || '/' || a.max_score,
    FALSE,
    g.graded_at + INTERVAL '30 minutes'
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN grades g ON s.submission_id = g.submission_id;

-- Instructor notifications
INSERT INTO notifications (user_id, message, read, created_at)
SELECT 
    c.instructor_id,
    'New submission for "' || a.title || '" from ' || u.name,
    FALSE,
    s.submitted_at + INTERVAL '1 hour'
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN users u ON s.student_id = u.user_id
JOIN courses c ON a.course_id = c.course_id;

-- Random read notifications (mark some as read)
UPDATE notifications 
SET read = TRUE 
WHERE random() < 0.3; -- 30% chance of being read

-- Some older notifications
INSERT INTO notifications (user_id, message, read, created_at)
SELECT 
    user_id,
    CASE 
        WHEN random() < 0.3 THEN 'Your profile information needs completion'
        WHEN random() < 0.6 THEN 'System maintenance scheduled for tomorrow'
        ELSE 'New features available in your dashboard'
    END,
    TRUE,
    CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM users
WHERE random() < 0.5; -- 50% chance for each user