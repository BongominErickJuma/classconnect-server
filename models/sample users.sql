-- Password: test1234 (bcrypt hashed with 12 rounds)
-- Hash: $2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S

INSERT INTO users (
    user_id, name, email, password_hash, role, profile_photo, email_verified, created_at, updated_at
) VALUES
-- Students
(gen_random_uuid(), 'Alice Akena', 'alice@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-1.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Brian Okello', 'brian@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-2.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Clare Namukasa', 'clare@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-3.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Daniel Oryem', 'daniel@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-4.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Esther Adong', 'esther@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-5.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Felix Kintu', 'felix@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-6.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Grace Nabirye', 'grace@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-7.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Henry Mugisha', 'henry@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-8.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Irene Nakyobe', 'irene@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-9.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Jacob Lumumba', 'jacob@student.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'student', '/uploads/users/user-10.jpg', TRUE, now(), now()),

-- Instructors
(gen_random_uuid(), 'Kevin Otim', 'kevin@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-11.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Linda Okoth', 'linda@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-12.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Martin Waiswa', 'martin@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-13.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Norah Kaggwa', 'norah@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-14.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Oscar Amanya', 'oscar@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-15.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Patricia Alobo', 'patricia@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-16.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Quincy Muwanga', 'quincy@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-17.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Rita Nabunya', 'rita@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-18.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Samuel Balikuddembe', 'samuel@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-19.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Tina Mukasa', 'tina@instructor.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'instructor', '/uploads/users/user-20.jpg', TRUE, now(), now()),

-- Admins
(gen_random_uuid(), 'Erick Bongomin', 'erick@admin.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'admin', '/uploads/users/user-21.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'Florence Akello', 'florence@admin.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'admin', '/uploads/users/user-22.jpg', TRUE, now(), now()),
(gen_random_uuid(), 'George Lwanga', 'george@admin.com', '$2b$12$zYq4VQaAPm26Cph5BkHnpO88GcHljrL0vvQ60VfpJxBf5C3kAAm9S', 'admin', '/uploads/users/user-23.jpg', TRUE, now(), now());
