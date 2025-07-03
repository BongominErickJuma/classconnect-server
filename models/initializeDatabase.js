const db = require('./../config/db');

async function initializeDatabase() {
  try {
    // Enable pgcrypto for UUID generation
    await db.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Users
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(20) CHECK (role IN ('instructor', 'student', 'admin')) DEFAULT 'student',
        profile_photo TEXT DEFAULT '/img/users/default.jpg',
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token TEXT,
        verification_token_expires TIMESTAMPTZ,
        reset_password_token TEXT,
        reset_token_expires TIMESTAMPTZ,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        password_changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_user_email ON users(email);
    `);

    // Courses
    await db.query(`
      CREATE TABLE IF NOT EXISTS courses (
        course_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(100) NOT NULL,
        description TEXT,
        instructor_id UUID NOT NULL REFERENCES users(user_id),
        cover_image TEXT DEFAULT '/img/courses/default.jpg',
        rating NUMERIC(4,2) DEFAULT 4.5,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_course_instructor ON courses(instructor_id);
    `);

    // Enrollments
    await db.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        student_id UUID NOT NULL REFERENCES users(user_id),
        course_id UUID NOT NULL REFERENCES courses(course_id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (student_id, course_id)
      );
      CREATE INDEX IF NOT EXISTS idx_enrollment_student ON enrollments(student_id);
      CREATE INDEX IF NOT EXISTS idx_enrollment_course ON enrollments(course_id);
    `);

    // Assignments
    await db.query(`
      CREATE TABLE IF NOT EXISTS assignments (
        assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(course_id),
        title VARCHAR(100) NOT NULL,
        description TEXT,
        due_date TIMESTAMPTZ,
        max_score NUMERIC(5,2),
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_assignment_course ON assignments(course_id);
    `);

    // Submissions
    await db.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        assignment_id UUID NOT NULL REFERENCES assignments(assignment_id),
        student_id UUID NOT NULL REFERENCES users(user_id),
        submitted_file TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (assignment_id, student_id)
      );
      CREATE INDEX IF NOT EXISTS idx_submission_assignment ON submissions(assignment_id);
      CREATE INDEX IF NOT EXISTS idx_submission_student ON submissions(student_id);
    `);

    // Grades
    await db.query(`
      CREATE TABLE IF NOT EXISTS grades (
        grade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        submission_id UUID NOT NULL UNIQUE REFERENCES submissions(submission_id),
        score NUMERIC(5,2),
        feedback TEXT,
        graded_by UUID NOT NULL REFERENCES users(user_id),
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_grade_submission ON grades(submission_id);
    `);

    // Resources
    await db.query(`
      CREATE TABLE IF NOT EXISTS resources (
        resource_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(course_id),
        title VARCHAR(100) NOT NULL,
        type VARCHAR(20) CHECK (type IN ('pdf', 'video', 'link', 'document')),
        file_url TEXT,
        is_deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_resource_course ON resources(course_id);
    `);

    // Notifications
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(user_id),
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ratings
    await db.query(`
      CREATE TABLE IF NOT EXISTS ratings (
        rating_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id UUID NOT NULL REFERENCES courses(course_id),
        student_id UUID NOT NULL REFERENCES users(user_id),
        rating INT CHECK (rating BETWEEN 1 AND 5),
        review TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (course_id, student_id)
      );
    `);

    console.log('✅ All tables checked and created if missing.');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error);
  }
}

module.exports = initializeDatabase;
