-- Grades for Introduction to Computer Science submissions
-- Programming Basics Project grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((70 + RANDOM() * 30)::numeric, 2), -- Scores between 70-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Excellent implementation! Clear code structure and good comments.'
        WHEN RANDOM() > 0.3 THEN 'Good work, but could improve variable naming and add more comments.'
        ELSE 'Basic requirements met, but needs better organization and error handling.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'Programming Basics Project';

-- Midterm Exam grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((60 + RANDOM() * 40)::numeric, 2), -- Scores between 60-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Outstanding performance! Demonstrated deep understanding.'
        WHEN RANDOM() > 0.3 THEN 'Solid work, with a few conceptual misunderstandings.'
        ELSE 'Needs more preparation. Review the course materials again.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'Midterm Exam';

-- Grades for Data Structures & Algorithms submissions
-- Linked List Implementation grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((75 + RANDOM() * 25)::numeric, 2), -- Scores between 75-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Flawless implementation! Excellent time complexity analysis.'
        WHEN RANDOM() > 0.3 THEN 'Good structure, but edge cases need more testing.'
        ELSE 'Basic functionality works, but needs optimization and better documentation.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'Linked List Implementation';

-- Sorting Algorithms Analysis grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((80 + RANDOM() * 20)::numeric, 2), -- Scores between 80-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Exceptional analysis! Clear benchmarks and insightful conclusions.'
        WHEN RANDOM() > 0.3 THEN 'Good comparison, but could use more test cases.'
        ELSE 'Basic analysis complete, needs deeper interpretation of results.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'Sorting Algorithms Analysis';

-- Grades for Database Systems submissions
-- Database Design Project grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((65 + RANDOM() * 35)::numeric, 2), -- Scores between 65-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Perfect normalization! Excellent schema design.'
        WHEN RANDOM() > 0.3 THEN 'Good structure, but some relationships could be improved.'
        ELSE 'Meets requirements, but needs better normalization in some tables.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'Database Design Project';

-- SQL Query Optimization grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((70 + RANDOM() * 30)::numeric, 2), -- Scores between 70-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Excellent optimizations! Queries are now highly efficient.'
        WHEN RANDOM() > 0.3 THEN 'Good improvements, but a few queries could still be tuned.'
        ELSE 'Basic optimizations made, needs more index analysis.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'SQL Query Optimization';

-- Grades for Web Development submissions
-- Personal Portfolio Website grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((75 + RANDOM() * 25)::numeric, 2), -- Scores between 75-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Stunning design! Perfect responsiveness and clean code.'
        WHEN RANDOM() > 0.3 THEN 'Good layout, but could improve mobile responsiveness.'
        ELSE 'Functional but needs better styling and organization.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'Personal Portfolio Website';

-- React Todo Application grades
INSERT INTO grades (submission_id, score, feedback, graded_by)
SELECT 
    s.submission_id,
    ROUND((80 + RANDOM() * 20)::numeric, 2), -- Scores between 80-100
    CASE 
        WHEN RANDOM() > 0.7 THEN 'Professional-grade application! Excellent state management.'
        WHEN RANDOM() > 0.3 THEN 'Good functionality, could improve component structure.'
        ELSE 'Works but needs better error handling and code organization.'
    END,
    c.instructor_id
FROM submissions s
JOIN assignments a ON s.assignment_id = a.assignment_id
JOIN courses c ON a.course_id = c.course_id
WHERE a.title = 'React Todo Application';