-- Generate ratings for completed courses (students can only rate courses they're enrolled in)
INSERT INTO ratings (course_id, student_id, rating, review, rated_at)
SELECT 
    e.course_id,
    e.student_id,
    CASE 
        WHEN random() < 0.1 THEN 1 -- 10% chance of 1-star
        WHEN random() < 0.2 THEN 2 -- 10% chance of 2-star
        WHEN random() < 0.4 THEN 3 -- 20% chance of 3-star
        WHEN random() < 0.7 THEN 4 -- 30% chance of 4-star
        ELSE 5                     -- 30% chance of 5-star
    END,
    CASE 
        WHEN random() < 0.3 THEN NULL -- 30% chance of no review
        ELSE 
            CASE 
                WHEN random() < 0.2 THEN 'This course changed my perspective completely!'
                WHEN random() < 0.4 THEN 'Excellent content and delivery.'
                WHEN random() < 0.6 THEN 'Good course overall, but could use more practical examples.'
                WHEN random() < 0.8 THEN 'The instructor was knowledgeable but the pace was too fast.'
                ELSE 'Needs improvement in organization and materials.'
            END
    END,
    CURRENT_TIMESTAMP - (random() * INTERVAL '30 days') -- Random date in last 30 days
FROM enrollments e
JOIN users u ON e.student_id = u.user_id
WHERE u.role = 'student'
AND random() < 0.7; -- 70% chance each student rated each course

-- Ensure each course has at least 3 ratings (for meaningful averages)
DO $$
DECLARE
    course_record RECORD;
    student_count INTEGER;
BEGIN
    FOR course_record IN SELECT course_id FROM courses LOOP
        SELECT COUNT(*) INTO student_count 
        FROM ratings 
        WHERE course_id = course_record.course_id;
        
        IF student_count < 3 THEN
            INSERT INTO ratings (course_id, student_id, rating, review, rated_at)
            SELECT 
                course_record.course_id,
                e.student_id,
                GREATEST(1, LEAST(5, FLOOR(random() * 5 + 1))), -- Random rating 1-5
                CASE WHEN random() < 0.5 THEN NULL ELSE 'Sample review for course rating' END,
                CURRENT_TIMESTAMP - (random() * INTERVAL '30 days')
            FROM enrollments e
            JOIN users u ON e.student_id = u.user_id
            WHERE e.course_id = course_record.course_id
            AND u.role = 'student'
            AND NOT EXISTS (
                SELECT 1 FROM ratings r 
                WHERE r.course_id = course_record.course_id 
                AND r.student_id = e.student_id
            )
            LIMIT 3 - student_count;
        END IF;
    END LOOP;
END $$;

-- Create some exceptional ratings (very positive/negative)
UPDATE ratings SET
    rating = CASE WHEN random() < 0.5 THEN 1 ELSE 5 END,
    review = CASE 
        WHEN rating = 1 THEN 'Worst course ever! The material was outdated and the instructor was unhelpful.'
        ELSE 'Absolutely phenomenal! The instructor was engaging and the content was life-changing.'
    END
WHERE random() < 0.1; -- 10% chance for extreme rating