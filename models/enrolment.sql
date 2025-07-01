
INSERT INTO enrollments (student_id, course_id)
VALUES
    -- Course 1 enrollments (6 students)
    ((SELECT user_id FROM users WHERE email = 'alice@student.com'), '0877bd55-6318-41ea-a80a-9bb6f60c16eb'),
    ((SELECT user_id FROM users WHERE email = 'brian@student.com'), '0877bd55-6318-41ea-a80a-9bb6f60c16eb'),
    ((SELECT user_id FROM users WHERE email = 'clare@student.com'), '0877bd55-6318-41ea-a80a-9bb6f60c16eb'),
    ((SELECT user_id FROM users WHERE email = 'daniel@student.com'),'0877bd55-6318-41ea-a80a-9bb6f60c16eb'),
    ((SELECT user_id FROM users WHERE email = 'esther@student.com'), '0877bd55-6318-41ea-a80a-9bb6f60c16eb'),
    ((SELECT user_id FROM users WHERE email = 'felix@student.com'), '0877bd55-6318-41ea-a80a-9bb6f60c16eb'),
    
    -- Course 2 enrollments (5 students)
    ((SELECT user_id FROM users WHERE email = 'grace@student.com'), 'eb9330d5-1327-4f0f-b1eb-f75d66782571'),
    ((SELECT user_id FROM users WHERE email = 'henry@student.com'), 'eb9330d5-1327-4f0f-b1eb-f75d66782571'),
    ((SELECT user_id FROM users WHERE email = 'irene@student.com'), 'eb9330d5-1327-4f0f-b1eb-f75d66782571'),
    ((SELECT user_id FROM users WHERE email = 'jacob@student.com'), 'eb9330d5-1327-4f0f-b1eb-f75d66782571'),
    ((SELECT user_id FROM users WHERE email = 'alice@student.com'), 'eb9330d5-1327-4f0f-b1eb-f75d66782571'),
    
    -- Course 3 enrollments (4 students)
    ((SELECT user_id FROM users WHERE email = 'brian@student.com'), 'f4f9bc93-015c-4535-b750-99a906e16d08'),
    ((SELECT user_id FROM users WHERE email = 'clare@student.com'), 'f4f9bc93-015c-4535-b750-99a906e16d08'),
    ((SELECT user_id FROM users WHERE email = 'grace@student.com'), 'f4f9bc93-015c-4535-b750-99a906e16d08'),
    ((SELECT user_id FROM users WHERE email = 'henry@student.com'), 'f4f9bc93-015c-4535-b750-99a906e16d08'),

     -- Course 4 (4 students - as requested)
    ((SELECT user_id FROM users WHERE email = 'grace@student.com'), '1512d3f3-fc41-4457-b3aa-6ffa78d6aed9'),
    ((SELECT user_id FROM users WHERE email = 'henry@student.com'), '1512d3f3-fc41-4457-b3aa-6ffa78d6aed9'),
    ((SELECT user_id FROM users WHERE email = 'irene@student.com'), '1512d3f3-fc41-4457-b3aa-6ffa78d6aed9'),
    ((SELECT user_id FROM users WHERE email = 'jacob@student.com'), '1512d3f3-fc41-4457-b3aa-6ffa78d6aed9'),
    
    -- Course 5 (1 student)
    ((SELECT user_id FROM users WHERE email = 'alice@student.com'), '3966a9b7-92f5-473c-8d75-b5c5a5501648'),
    
    -- Course 6 (2 students)
    ((SELECT user_id FROM users WHERE email = 'brian@student.com'), 'b39791a3-df39-458f-9e61-2d55329f9806'),
    ((SELECT user_id FROM users WHERE email = 'clare@student.com'), 'b39791a3-df39-458f-9e61-2d55329f9806'),
    
    -- Course 7 (3 students)
    ((SELECT user_id FROM users WHERE email = 'daniel@student.com'), 'cb373de8-8965-4646-857b-02ff9981d3fc'),
    ((SELECT user_id FROM users WHERE email = 'esther@student.com'), 'cb373de8-8965-4646-857b-02ff9981d3fc'),
    ((SELECT user_id FROM users WHERE email = 'felix@student.com'), 'cb373de8-8965-4646-857b-02ff9981d3fc'),
    
    -- Course 8 (1 student)
    ((SELECT user_id FROM users WHERE email = 'grace@student.com'), 'd118a9da-75ee-4311-95b1-bd0e30ca8da3'),
    
    -- Course 9 (2 students)
    ((SELECT user_id FROM users WHERE email = 'henry@student.com'), 'dcc35565-3be4-46f4-9da2-14b734292002'),
    ((SELECT user_id FROM users WHERE email = 'irene@student.com'), 'dcc35565-3be4-46f4-9da2-14b734292002'),
    
    -- Course 10 (3 students)
    ((SELECT user_id FROM users WHERE email = 'jacob@student.com'), 'ef5355c3-b852-43bf-90f1-3ba6943b5548'),
    ((SELECT user_id FROM users WHERE email = 'alice@student.com'), 'ef5355c3-b852-43bf-90f1-3ba6943b5548'),
    ((SELECT user_id FROM users WHERE email = 'brian@student.com'), 'ef5355c3-b852-43bf-90f1-3ba6943b5548')
ON CONFLICT (student_id, course_id) DO NOTHING;  -- Skip if enrollment already exists

