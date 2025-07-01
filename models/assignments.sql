-- Assignments for Introduction to Computer Science
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Programming Basics Project',
    'Create a simple program demonstrating variables, loops, and conditionals',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    100
FROM courses WHERE title = 'Introduction to Computer Science';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Midterm Exam',
    'Covers all material from weeks 1-5',
    CURRENT_TIMESTAMP + INTERVAL '28 days',
    150
FROM courses WHERE title = 'Introduction to Computer Science';

-- Assignments for Data Structures & Algorithms
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Linked List Implementation',
    'Implement a singly linked list with basic operations',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    80
FROM courses WHERE title = 'Data Structures & Algorithms';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Sorting Algorithms Analysis',
    'Compare performance of different sorting algorithms',
    CURRENT_TIMESTAMP + INTERVAL '21 days',
    100
FROM courses WHERE title = 'Data Structures & Algorithms';

-- Assignments for Operating Systems
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Process Scheduling Simulation',
    'Implement a CPU scheduling algorithm',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    120
FROM courses WHERE title = 'Operating Systems';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Memory Management Lab',
    'Experiment with different memory allocation strategies',
    CURRENT_TIMESTAMP + INTERVAL '28 days',
    100
FROM courses WHERE title = 'Operating Systems';

-- Assignments for Database Systems
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Database Design Project',
    'Design a normalized schema for a given business case',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    150
FROM courses WHERE title = 'Database Systems';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'SQL Query Optimization',
    'Analyze and optimize given SQL queries',
    CURRENT_TIMESTAMP + INTERVAL '21 days',
    100
FROM courses WHERE title = 'Database Systems';

-- Assignments for Computer Networks
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Network Protocol Analysis',
    'Use Wireshark to analyze network traffic',
    CURRENT_TIMESTAMP + INTERVAL '10 days',
    80
FROM courses WHERE title = 'Computer Networks';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Routing Algorithms Simulation',
    'Implement Dijkstras algorithm for routing',
    CURRENT_TIMESTAMP + INTERVAL '24 days',
    120
FROM courses WHERE title = 'Computer Networks';

-- Assignments for Software Engineering
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Agile Development Plan',
    'Create user stories and sprint plan for a project',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    50
FROM courses WHERE title = 'Software Engineering';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'System Design Document',
    'Design architecture for a scalable web application',
    CURRENT_TIMESTAMP + INTERVAL '21 days',
    150
FROM courses WHERE title = 'Software Engineering';

-- Assignments for Web Development
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Personal Portfolio Website',
    'Build a responsive portfolio using HTML/CSS/JS',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    100
FROM courses WHERE title = 'Web Development';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'React Todo Application',
    'Create a todo app with React and Node.js backend',
    CURRENT_TIMESTAMP + INTERVAL '28 days',
    150
FROM courses WHERE title = 'Web Development';

-- Assignments for Artificial Intelligence
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Linear Regression Implementation',
    'Implement linear regression from scratch',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    100
FROM courses WHERE title = 'Artificial Intelligence';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'MNIST Classification',
    'Build a classifier for handwritten digits',
    CURRENT_TIMESTAMP + INTERVAL '28 days',
    150
FROM courses WHERE title = 'Artificial Intelligence';

-- Assignments for Embedded Systems
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'LED Blinking Circuit',
    'Build and program a basic LED circuit',
    CURRENT_TIMESTAMP + INTERVAL '7 days',
    50
FROM courses WHERE title = 'Embedded Systems';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Sensor Data Logger',
    'Create a system to log and display sensor data',
    CURRENT_TIMESTAMP + INTERVAL '21 days',
    120
FROM courses WHERE title = 'Embedded Systems';

-- Assignments for Cybersecurity Fundamentals
INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Password Cracking Lab',
    'Analyze password security using cracking tools',
    CURRENT_TIMESTAMP + INTERVAL '14 days',
    80
FROM courses WHERE title = 'Cybersecurity Fundamentals';

INSERT INTO assignments (course_id, title, description, due_date, max_score)
SELECT 
    course_id,
    'Network Vulnerability Assessment',
    'Perform a security scan and write a report',
    CURRENT_TIMESTAMP + INTERVAL '28 days',
    120
FROM courses WHERE title = 'Cybersecurity Fundamentals';