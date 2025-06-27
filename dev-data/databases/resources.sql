-- Resources for Introduction to Computer Science
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Programming Fundamentals PDF',
    'pdf',
    '/uploads/resources/cs101-programming-fundamentals.pdf'
FROM courses WHERE title = 'Introduction to Computer Science';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Variables and Loops Video',
    'video',
    '/uploads/resources/cs101-variables-loops.mp4'
FROM courses WHERE title = 'Introduction to Computer Science';

-- Resources for Data Structures & Algorithms
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Big-O Notation Cheatsheet',
    'document',
    '/uploads/resources/dsa-big-o-cheatsheet.docx'
FROM courses WHERE title = 'Data Structures & Algorithms';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Visualizing Data Structures',
    'link',
    'https://visualgo.net/en'
FROM courses WHERE title = 'Data Structures & Algorithms';

-- Resources for Operating Systems
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Process Scheduling Slides',
    'pdf',
    '/uploads/resources/os-process-scheduling.pdf'
FROM courses WHERE title = 'Operating Systems';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Virtual Memory Explained',
    'video',
    '/uploads/resources/os-virtual-memory.mp4'
FROM courses WHERE title = 'Operating Systems';

-- Resources for Database Systems
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'SQL Practice Exercises',
    'document',
    '/uploads/resources/db-sql-practice.docx'
FROM courses WHERE title = 'Database Systems';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'PostgreSQL Documentation',
    'link',
    'https://www.postgresql.org/docs/'
FROM courses WHERE title = 'Database Systems';

-- Resources for Computer Networks
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'TCP/IP Protocol Stack',
    'pdf',
    '/uploads/resources/networks-tcp-ip.pdf'
FROM courses WHERE title = 'Computer Networks';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Wireshark Tutorial',
    'video',
    '/uploads/resources/networks-wireshark.mp4'
FROM courses WHERE title = 'Computer Networks';

-- Resources for Software Engineering
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Agile Methodology Guide',
    'pdf',
    '/uploads/resources/se-agile-guide.pdf'
FROM courses WHERE title = 'Software Engineering';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Git Cheatsheet',
    'link',
    'https://education.github.com/git-cheat-sheet-education.pdf'
FROM courses WHERE title = 'Software Engineering';

-- Resources for Web Development
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'HTML/CSS Reference',
    'pdf',
    '/uploads/resources/web-html-css-ref.pdf'
FROM courses WHERE title = 'Web Development';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'React Tutorial Series',
    'video',
    '/uploads/resources/web-react-tutorials.mp4'
FROM courses WHERE title = 'Web Development';

-- Resources for Artificial Intelligence
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Machine Learning Basics',
    'pdf',
    '/uploads/resources/ai-ml-basics.pdf'
FROM courses WHERE title = 'Artificial Intelligence';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'TensorFlow Playground',
    'link',
    'https://playground.tensorflow.org'
FROM courses WHERE title = 'Artificial Intelligence';

-- Resources for Embedded Systems
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Arduino Starter Guide',
    'pdf',
    '/uploads/resources/embedded-arduino-guide.pdf'
FROM courses WHERE title = 'Embedded Systems';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Sensor Calibration Video',
    'video',
    '/uploads/resources/embedded-sensors.mp4'
FROM courses WHERE title = 'Embedded Systems';

-- Resources for Cybersecurity Fundamentals
INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'Security Best Practices',
    'pdf',
    '/uploads/resources/cyber-best-practices.pdf'
FROM courses WHERE title = 'Cybersecurity Fundamentals';

INSERT INTO resources (course_id, title, type, file_url)
SELECT 
    course_id,
    'OWASP Top 10',
    'link',
    'https://owasp.org/www-project-top-ten/'
FROM courses WHERE title = 'Cybersecurity Fundamentals';