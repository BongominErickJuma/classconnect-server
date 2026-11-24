const db = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { id, optionalId, page, sendPage } = require('../utils/assignmentAccess');
const { recentPresence } = require('../utils/userPresence');

exports.getHeaderCounts = catchAsync(async (req, res) => {
  const { rows: [data] } = await db.query(`
    SELECT (SELECT COUNT(*)::int FROM courses WHERE is_deleted IS NOT TRUE) AS courses,
           COUNT(*)::int AS total_users,
           (COUNT(*) FILTER (WHERE ${recentPresence}))::int AS online_users
    FROM users WHERE is_deleted IS NOT TRUE`);
  res.json({ status: 'success', data });
});

function calendarDate(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError('Choose a valid date.', 400);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new AppError('Choose a valid date.', 400);
  }
  return value;
}

function dateRange({ start, end, tz = 'UTC' }) {
  const first = start === undefined ? null : calendarDate(start);
  const last = end === undefined ? null : calendarDate(end);
  if (first && last && first > last) {
    throw new AppError('The start date must come before or match the end date.', 400);
  }
  try {
    if (typeof tz !== 'string' || tz.length > 64 || /^[+-]/.test(tz)) throw new RangeError();
    tz = new Intl.DateTimeFormat('en', { timeZone: tz }).resolvedOptions().timeZone;
  } catch {
    throw new AppError('Choose a valid time zone.', 400);
  }
  return [first, last, tz];
}

exports.getFilters = catchAsync(async (req, res) => {
  const courseId = optionalId(req.query.course_id, 'Course');
  const owner = req.user.user_id;
  if (req.user.role === 'student') {
    const { rows: courses } = await db.query(`
      SELECT c.course_id, c.title FROM enrollments e JOIN courses c USING (course_id)
      WHERE e.student_id = $1 AND c.is_deleted IS NOT TRUE
      ORDER BY c.title, c.course_id`, [owner]);
    return res.json({ status: 'success', data: { courses, assignments: [] } });
  }
  const { rows: courses } = await db.query(`
    SELECT course_id, title FROM courses
    WHERE instructor_id = $1 AND is_deleted IS NOT TRUE
    ORDER BY title, course_id`, [owner]);
  const assignments = courseId ? (await db.query(`
    SELECT a.assignment_id, a.title FROM assignments a JOIN courses c USING (course_id)
    WHERE c.instructor_id = $1 AND c.course_id = $2
      AND c.is_deleted IS NOT TRUE AND a.is_deleted IS NOT TRUE
    ORDER BY a.title, a.assignment_id`, [owner, courseId])).rows : [];
  res.json({ status: 'success', data: { courses, assignments } });
});

function sendStudentPage(res, rows, { number, limit }) {
  const data = rows.slice(0, limit);
  res.json({ status: 'success', results: data.length, data, page: number, hasMore: rows.length > limit });
}

exports.getStudentActivity = catchAsync(async (req, res) => {
  const pagination = page({ limit: 15, ...req.query });
  const type = req.query.type ?? null;
  if (type !== null && !['submission', 'enrollment', 'rating'].includes(type)) {
    throw new AppError('Choose a valid activity type.', 400);
  }
  const { rows } = await db.query(`
    WITH active_courses AS (
      SELECT c.course_id, c.title, e.enrollment_id, e.created_at
      FROM enrollments e JOIN courses c USING (course_id)
      WHERE e.student_id = $1 AND c.is_deleted IS NOT TRUE
        AND ($2::uuid IS NULL OR c.course_id = $2)
    ), events AS (
      SELECT s.submission_id AS event_id, 'submission' AS type, a.title AS reference,
             c.course_id, c.title AS course_title, a.assignment_id, s.submitted_at AS created_at
      FROM submissions s JOIN assignments a USING (assignment_id) JOIN active_courses c USING (course_id)
      WHERE s.student_id = $1 AND s.is_deleted IS NOT TRUE AND a.is_deleted IS NOT TRUE
      UNION ALL
      SELECT r.rating_id, 'rating', r.title, r.course_id, r.title, NULL::uuid, r.created_at
      FROM course_review_entries r WHERE r.student_id = $1 AND r.is_hidden IS FALSE
        AND ($2::uuid IS NULL OR r.course_id = $2)
      UNION ALL
      SELECT c.enrollment_id, 'enrollment', c.title, c.course_id, c.title, NULL::uuid, c.created_at
      FROM active_courses c
    )
    SELECT * FROM events WHERE ($3::text IS NULL OR type = $3)
      AND ($4::date IS NULL OR created_at >= ($4::date::timestamp AT TIME ZONE $6))
      AND ($5::date IS NULL OR created_at < (($5::date + 1)::timestamp AT TIME ZONE $6))
    ORDER BY created_at DESC NULLS LAST, type, event_id LIMIT $7 OFFSET $8`,
    [req.user.user_id, optionalId(req.query.course_id, 'Course'), type, ...dateRange(req.query),
      pagination.limit + 1, pagination.offset]);
  sendStudentPage(res, rows, pagination);
});

exports.getStudentDeadlines = catchAsync(async (req, res) => {
  const pagination = page({ limit: 10, ...req.query });
  const { rows } = await db.query(`
    SELECT a.assignment_id, a.title, a.due_date, c.title AS course_title, c.course_id
    FROM enrollments e JOIN courses c USING (course_id) JOIN assignments a USING (course_id)
    WHERE e.student_id = $1 AND ($2::uuid IS NULL OR c.course_id = $2)
      AND a.due_date > NOW() AND a.is_deleted IS NOT TRUE AND c.is_deleted IS NOT TRUE
      AND NOT EXISTS (
        SELECT 1 FROM submissions s
        WHERE s.assignment_id = a.assignment_id AND s.student_id = $1 AND s.is_deleted IS NOT TRUE
      )
      AND ($3::date IS NULL OR a.due_date >= ($3::date::timestamp AT TIME ZONE $5))
      AND ($4::date IS NULL OR a.due_date < (($4::date + 1)::timestamp AT TIME ZONE $5))
    ORDER BY a.due_date ASC, a.assignment_id LIMIT $6 OFFSET $7`,
    [req.user.user_id, optionalId(req.query.course_id, 'Course'), ...dateRange(req.query),
      pagination.limit + 1, pagination.offset]);
  sendStudentPage(res, rows, pagination);
});

exports.getStudentGrades = catchAsync(async (req, res) => {
  const pagination = page({ limit: 10, ...req.query });
  const { rows } = await db.query(`
    SELECT g.grade_id, g.score, g.feedback, g.updated_at, COALESCE(a.max_score, 100) AS max_score,
           u.name, u.profile_photo, a.assignment_id, a.title, c.course_id, c.title AS course_title
    FROM grades g JOIN submissions s USING (submission_id)
    JOIN users u ON g.graded_by = u.user_id
    JOIN assignments a USING (assignment_id) JOIN courses c USING (course_id)
    WHERE s.student_id = $1 AND ($2::uuid IS NULL OR c.course_id = $2)
      AND a.is_deleted IS NOT TRUE AND s.is_deleted IS NOT TRUE AND c.is_deleted IS NOT TRUE
      AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.course_id AND e.student_id = $1)
      AND ($3::date IS NULL OR g.updated_at >= ($3::date::timestamp AT TIME ZONE $5))
      AND ($4::date IS NULL OR g.updated_at < (($4::date + 1)::timestamp AT TIME ZONE $5))
    ORDER BY g.updated_at DESC NULLS LAST, g.grade_id DESC LIMIT $6 OFFSET $7`,
    [req.user.user_id, optionalId(req.query.course_id, 'Course'), ...dateRange(req.query),
      pagination.limit + 1, pagination.offset]);
  sendStudentPage(res, rows, pagination);
});

exports.getGrading = catchAsync(async (req, res) => {
  const pagination = page(req.query);
  const { rows: [{ data, total }] } = await db.query(`
    WITH pending AS (
      SELECT s.submission_id, s.submitted_at, student.name AS student_name,
             c.course_id, c.title AS course_title, a.assignment_id, a.title AS assignment_title,
             MIN(s.submitted_at) OVER (PARTITION BY a.assignment_id) AS oldest,
             COUNT(*) OVER (PARTITION BY a.assignment_id)::int AS assignment_pending
      FROM submissions s JOIN assignments a USING (assignment_id)
      JOIN courses c USING (course_id) JOIN users student ON student.user_id = s.student_id
      WHERE c.instructor_id = $1 AND ($2::uuid IS NULL OR c.course_id = $2)
        AND ($3::uuid IS NULL OR a.assignment_id = $3)
        AND c.is_deleted IS NOT TRUE AND a.is_deleted IS NOT TRUE AND s.is_deleted IS NOT TRUE
        AND NOT EXISTS (SELECT 1 FROM grades g WHERE g.submission_id = s.submission_id)
    )
    SELECT (SELECT COUNT(*) FROM pending)::int AS total,
      ARRAY(
        SELECT to_jsonb(p) - 'oldest' FROM pending p
        ORDER BY oldest ASC NULLS LAST, course_id, assignment_id, submitted_at ASC NULLS LAST, submission_id
        LIMIT $4 OFFSET $5
      ) AS data`,
    [req.user.user_id, optionalId(req.query.course_id, 'Course'),
      optionalId(req.query.assignment_id, 'Assignment'), pagination.limit + 1, pagination.offset]);
  sendPage(res, data, pagination, total);
});

exports.getActivity = catchAsync(async (req, res) => {
  const pagination = page(req.query);
  const type = req.query.type ?? null;
  if (type !== null && !['student_enrolled', 'grade_given', 'course_rated'].includes(type)) {
    throw new AppError('Choose a valid activity type.', 400);
  }
  const { rows } = await db.query(`
    WITH owned_courses AS (
      SELECT course_id, title FROM courses
      WHERE instructor_id = $1 AND is_deleted IS NOT TRUE AND ($2::uuid IS NULL OR course_id = $2)
    ), events AS (
      SELECT e.enrollment_id::text AS event_id, 'student_enrolled' AS type,
             c.course_id, c.title AS course_title, u.name AS actor_name, NULL::text AS subject, e.created_at
      FROM enrollments e JOIN owned_courses c USING (course_id) JOIN users u ON u.user_id = e.student_id
      UNION ALL
      SELECT g.grade_id::text, 'grade_given', c.course_id, c.title, u.name, a.title, g.updated_at
      FROM grades g JOIN submissions s USING (submission_id) JOIN assignments a USING (assignment_id)
      JOIN owned_courses c USING (course_id) JOIN users u ON u.user_id = s.student_id
      WHERE g.graded_by = $1 AND a.is_deleted IS NOT TRUE AND s.is_deleted IS NOT TRUE
      UNION ALL
      SELECT r.rating_id::text, 'course_rated', c.course_id, c.title, r.name, NULL::text, r.created_at
      FROM course_review_entries r JOIN owned_courses c USING (course_id) WHERE r.is_hidden IS FALSE
    ), matching AS (
      SELECT *, (created_at AT TIME ZONE $6)::date AS local_day FROM events
      WHERE ($3::text IS NULL OR type = $3)
        AND ($4::date IS NULL OR created_at >= ($4::date::timestamp AT TIME ZONE $6))
        AND ($5::date IS NULL OR created_at < (($5::date + 1)::timestamp AT TIME ZONE $6))
    ), feed AS (
      SELECT event_id, type, course_id, course_title, actor_name, subject, created_at,
             NULL::text AS enrollment_day, 1 AS event_count
      FROM matching WHERE type <> 'student_enrolled' OR local_day IS NULL
      UNION ALL
      SELECT course_id::text || ':' || local_day::text, type, course_id, course_title,
             CASE WHEN COUNT(*) = 1 THEN MIN(actor_name) END, NULL::text, MAX(created_at),
             to_char(local_day, 'YYYY-MM-DD'), COUNT(*)::int
      FROM matching WHERE type = 'student_enrolled' AND local_day IS NOT NULL
      GROUP BY course_id, course_title, local_day, type
    )
    SELECT * FROM feed ORDER BY created_at DESC NULLS LAST, type, event_id LIMIT $7 OFFSET $8`,
    [req.user.user_id, optionalId(req.query.course_id, 'Course'), type, ...dateRange(req.query),
      pagination.limit + 1, pagination.offset]);
  sendPage(res, rows, pagination);
});

exports.getEnrollmentMembers = catchAsync(async (req, res) => {
  const pagination = page(req.query);
  const day = calendarDate(req.query.day);
  const [, , tz] = dateRange({ tz: req.query.tz });
  const { rows } = await db.query(`
    SELECT e.enrollment_id, u.name
    FROM enrollments e JOIN courses c USING (course_id) JOIN users u ON u.user_id = e.student_id
    WHERE c.instructor_id = $1 AND c.course_id = $2 AND c.is_deleted IS NOT TRUE
      AND e.created_at >= ($3::date::timestamp AT TIME ZONE $4)
      AND e.created_at < (($3::date + 1)::timestamp AT TIME ZONE $4)
    ORDER BY e.created_at DESC, e.enrollment_id LIMIT $5 OFFSET $6`,
    [req.user.user_id, id(req.query.course_id, 'Course'), day, tz, pagination.limit + 1, pagination.offset]);
  sendPage(res, rows, pagination);
});

exports.getReviews = catchAsync(async (req, res) => {
  const pagination = page(req.query);
  const stars = req.query.stars ?? null;
  if (stars !== null && !['1', '2', '3', '4', '5'].includes(stars)) {
    throw new AppError('Choose a rating from 1 to 5 stars.', 400);
  }
  const { rows } = await db.query(`
    SELECT rating_id, course_id, rating, review, name, profile_photo, title, created_at
    FROM course_review_entries WHERE instructor_id = $1 AND is_hidden IS FALSE
      AND ($2::uuid IS NULL OR course_id = $2) AND ($3::int IS NULL OR rating = $3)
      AND ($4::date IS NULL OR created_at >= ($4::date::timestamp AT TIME ZONE $6))
      AND ($5::date IS NULL OR created_at < (($5::date + 1)::timestamp AT TIME ZONE $6))
    ORDER BY created_at DESC NULLS LAST, rating_id DESC LIMIT $7 OFFSET $8`,
    [req.user.user_id, optionalId(req.query.course_id, 'Course'), stars, ...dateRange(req.query),
      pagination.limit + 1, pagination.offset]);
  sendPage(res, rows, pagination);
});
