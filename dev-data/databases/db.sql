-- Replace instructor_x_id with actual instructor user_ids from your DB
INSERT INTO courses (
  course_id, title, description, cover_image, instructor_id, created_at, updated_at
) VALUES
(gen_random_uuid(), 'Introduction to Computer Science', 'Basics of programming, logic and computing.', '/uploads/courses/course-1-cover.jpg', '05d390ec-6c07-442b-8932-07a1ab908598', now(), now()),
(gen_random_uuid(), 'Data Structures & Algorithms', 'Learn stacks, queues, trees, graphs and their applications.', '/uploads/courses/course-2-cover.jpg', '1e237338-a1fd-45be-812a-9c6cb60e6fc4', now(), now()),
(gen_random_uuid(), 'Operating Systems', 'Processes, threads, memory, and file systems.', '/uploads/courses/course-3-cover.jpg', '2e0fb215-01f0-4f9d-a0b4-0854f6537a76', now(), now()),
(gen_random_uuid(), 'Database Systems', 'SQL, PostgreSQL, normalization, indexing.', '/uploads/courses/course-4-cover.jpg', '31bfe7bd-2597-4221-84ce-d9af46b4da7b', now(), now()),
(gen_random_uuid(), 'Computer Networks', 'OSI model, TCP/IP, routing, and switching.', '/uploads/courses/course-5-cover.jpg', '31bfe7bd-2597-4221-84ce-d9af46b4da7b', now(), now()),
(gen_random_uuid(), 'Software Engineering', 'Agile, SDLC, system design, version control.', '/uploads/courses/course-6-cover.jpg', '64c2a47c-5dc6-4148-8bd4-2b43d45b7d94', now(), now()),
(gen_random_uuid(), 'Web Development', 'HTML, CSS, JavaScript, React, Node.js.', '/uploads/courses/course-7-cover.jpg', '6ac19094-7072-4c24-8c76-434290af5044', now(), now()),
(gen_random_uuid(), 'Artificial Intelligence', 'ML fundamentals, supervised and unsupervised learning.', '/uploads/courses/course-8-cover.jpg', 'c437308d-1b29-4227-81ca-71eb7b0bfb59', now(), now()),
(gen_random_uuid(), 'Embedded Systems', 'Microcontrollers, sensors, and real-time systems.', '/uploads/courses/course-9-cover.jpg', 'ce544e13-016b-43da-9b3c-819986bcc883', now(), now()),
(gen_random_uuid(), 'Cybersecurity Fundamentals', 'Network security, cryptography, threat modeling.', '/uploads/courses/course-10-cover.jpg', 'e87982bd-60ff-46e9-a8d5-3d008a50d4ae', now(), now()); -- no instructor
