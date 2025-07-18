const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');

exports.getStudentRecentGrades = catchAsync(async (req, res, next) => {
  const studentId = req.user.user_id;

  const query = {
    text: `
      SELECT 
      g.score,
      g.feedback,   
      u.name,
      a.title,
      u.profile_photo 
      FROM grades g
      JOIN submissions s ON g.submission_id = s.submission_id
      JOIN users u ON g.graded_by = u.user_id
      JOIN assignments a ON s.assignment_id = a.assignment_id
      WHERE s.student_id = $1
      ORDER BY g.created_at DESC
      LIMIT 10
    `,
    values: [studentId],
  };

  const result = await db.query(query);
  const grades = result.rows;

  res.status(200).json({
    status: 'success',
    results: grades.length,
    data: grades,
  });
});

exports.getInstructorRecentReviews = catchAsync(async (req, res, next) => {
  const instructorId = req.user.user_id;

  const query = {
    text: `
      SELECT
      r.rating,
      r.review,
      u.name,
      u.profile_photo,
      c.title
      FROM ratings r
      JOIN users u ON r.student_id = u.user_id
      JOIN courses c ON r.course_id = c.course_id
      WHERE c.instructor_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `,
    values: [instructorId],
  };

  const result = await db.query(query);
  const reviews = result.rows;

  res.status(200).json({
    status: 'success',
    results: reviews.length,
    data: reviews,
  });
});

exports.getStudentRecentActivities = catchAsync(async (req, res, next) => {
  const studentId = req.user.user_id;

  const query = {
    text: `
      (
        SELECT 'submission' AS type, a.title AS reference, a.course_id, s.created_at
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.assignment_id
        WHERE s.student_id = $1
      )
      UNION
      (
        SELECT 'rating' AS type, c.title AS reference, c.course_id, r.created_at
        FROM ratings r
        JOIN courses c ON r.course_id = c.course_id
        WHERE r.student_id = $1
      )
      UNION
      (
        SELECT 'enrollment' AS type, c.title AS reference, c.course_id, e.created_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.course_id
        WHERE e.student_id = $1
      )
      ORDER BY created_at DESC
      LIMIT 15
    `,
    values: [studentId],
  };

  const result = await db.query(query);

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: result.rows,
  });
});

exports.getInstructorRecentActivities = catchAsync(async (req, res, next) => {
  const instructorId = req.user.user_id;

  const query = {
    text: `
      (
        SELECT 'grade_given' AS type, u.name || ' GRADED ' || s.submitted_file AS reference, g.created_at
        FROM grades g
        JOIN submissions s ON g.submission_id = s.submission_id
        JOIN users u ON s.student_id = u.user_id
        WHERE g.graded_by = $1
      )
      UNION
      (
        SELECT 'student_enrolled' AS type, u.name || ' ENROLLED IN ' || c.title AS reference, e.created_at
        FROM enrollments e
        JOIN courses c ON e.course_id = c.course_id
        JOIN users u ON e.student_id = u.user_id
        WHERE c.instructor_id = $1
      )
      UNION
      (
        SELECT 'course_rated' AS type, u.name || ' RATED ' || c.title AS reference, r.created_at
        FROM ratings r
        JOIN courses c ON r.course_id = c.course_id
        JOIN users u ON r.student_id = u.user_id
        WHERE c.instructor_id = $1
      )
      ORDER BY created_at DESC
      LIMIT 15
    `,
    values: [instructorId],
  };

  const result = await db.query(query);

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: result.rows,
  });
});

exports.getStudentUpcomingDeadlines = catchAsync(async (req, res, next) => {
  const studentId = req.user.user_id;

  const query = {
    text: `
      SELECT a.assignment_id, a.title, a.due_date, c.title AS course_title, c.course_id
      FROM enrollments e
      JOIN courses c ON e.course_id = c.course_id
      JOIN assignments a ON a.course_id = c.course_id
      LEFT JOIN submissions s 
        ON s.assignment_id = a.assignment_id AND s.student_id = $1
      WHERE e.student_id = $1
        AND s.submission_id IS NULL
        AND a.due_date > NOW()
      ORDER BY a.due_date ASC
      LIMIT 10
    `,
    values: [studentId],
  };

  const result = await db.query(query);

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: result.rows,
  });
});

exports.getInstructorUpcomingDeadlines = catchAsync(async (req, res, next) => {
  const instructorId = req.user.user_id;

  const query = {
    text: `
      SELECT a.assignment_id, a.title, s.submission_id, u.name AS student_name,
             s.created_at AS submitted_at, c.title AS course_title
      FROM courses c
      JOIN assignments a ON a.course_id = c.course_id
      JOIN submissions s ON s.assignment_id = a.assignment_id
      JOIN users u ON s.student_id = u.user_id
      LEFT JOIN grades g ON g.submission_id = s.submission_id
      WHERE c.instructor_id = $1
        AND g.grade_id IS NULL
      ORDER BY s.created_at ASC
      LIMIT 10
    `,
    values: [instructorId],
  };

  const result = await db.query(query);

  res.status(200).json({
    status: 'success',
    results: result.rows.length,
    data: result.rows,
  });
});

exports.getStudentDashboardMetrics = catchAsync(async (req, res, next) => {
  const studentId = req.user.user_id;

  const query = {
    text: `
      SELECT
        (SELECT COUNT(*) FROM courses) AS total_courses,
        (SELECT COUNT(*) FROM enrollments WHERE student_id = $1) AS enrolled_courses,
        (SELECT COUNT(*) FROM users WHERE role = 'student') AS students_reached,
        (SELECT COUNT(*)
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.assignment_id
         LEFT JOIN grades g ON g.submission_id = s.submission_id
         WHERE s.student_id = $1 AND g.grade_id IS NULL) AS pending_grades
    `,
    values: [studentId],
  };

  const result = await db.query(query);
  const resultStats = result.rows[0];

  const stats = {
    total_courses: resultStats.total_courses,
    enrolled_courses: resultStats.enrolled_courses,
    students_reached: resultStats.students_reached,
    pending_grades: resultStats.pending_grades,
  };

  res.status(200).json({
    status: 'success',
    data: stats,
  });
});

exports.getInstructorDashboardMetrics = catchAsync(async (req, res, next) => {
  const instructorId = req.user.user_id;

  // Total courses on the platform
  const totalCoursesQuery = {
    text: `SELECT COUNT(*) FROM courses`,
  };
  const totalCoursesRes = await db.query(totalCoursesQuery);
  const totalCourses = parseInt(totalCoursesRes.rows[0].count, 10);

  // Courses taught by the instructor
  const myCoursesQuery = {
    text: `SELECT course_id FROM courses WHERE instructor_id = $1`,
    values: [instructorId],
  };
  const myCoursesRes = await db.query(myCoursesQuery);
  const myCourses = myCoursesRes.rows.map((row) => row.course_id);
  const myCoursesCount = myCourses.length;

  // Students Reached = total students in the system
  const studentsReachedQuery = {
    text: `SELECT COUNT(*) FROM users WHERE role = 'student'`,
  };
  const studentsReachedRes = await db.query(studentsReachedQuery);
  const studentsReached = parseInt(studentsReachedRes.rows[0].count, 10);

  // Reviews for instructor's courses
  let totalReviews = 0;
  if (myCourses.length > 0) {
    const reviewsQuery = {
      text: `SELECT COUNT(*) FROM ratings WHERE course_id = ANY($1)`,
      values: [myCourses],
    };
    const reviewsRes = await db.query(reviewsQuery);
    totalReviews = parseInt(reviewsRes.rows[0].count, 10);
  }

  // Raw stats
  const stats = {
    total_courses: totalCourses,
    my_courses: myCoursesCount,
    students_reached: studentsReached,
    total_reviews: totalReviews,
  };

  // Dashboard cards

  res.status(200).json({
    status: 'success',
    data: stats,
  });
});
