-- Submissions for Introduction to Computer Science assignments
-- Assignment 1: Programming Basics Project
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/programming-basics-' || u.name || '.zip'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'Programming Basics Project'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Assignment 2: Midterm Exam
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/midterm-' || u.name || '.pdf'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'Midterm Exam'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Submissions for Data Structures & Algorithms assignments
-- Assignment 1: Linked List Implementation
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/linkedlist-' || u.name || '.zip'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'Linked List Implementation'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Assignment 2: Sorting Algorithms Analysis
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/sorting-' || u.name || '.pdf'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'Sorting Algorithms Analysis'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Submissions for Database Systems assignments
-- Assignment 1: Database Design Project
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/db-design-' || u.name || '.sql'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'Database Design Project'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Assignment 2: SQL Query Optimization
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/query-opt-' || u.name || '.pdf'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'SQL Query Optimization'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Submissions for Web Development assignments
-- Assignment 1: Personal Portfolio Website
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/portfolio-' || u.name || '.zip'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'Personal Portfolio Website'
ON CONFLICT (assignment_id, student_id) DO NOTHING;

-- Assignment 2: React Todo Application
INSERT INTO submissions (assignment_id, student_id, submitted_file)
SELECT 
    a.assignment_id,
    u.user_id,
    '/uploads/submissions/todo-app-' || u.name || '.zip'
FROM assignments a
JOIN enrollments e ON a.course_id = e.course_id
JOIN users u ON e.student_id = u.user_id
WHERE a.title = 'React Todo Application'
ON CONFLICT (assignment_id, student_id) DO NOTHING;