const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const { actor, id, optionalId, page, sendPage } = require('../utils/assignmentAccess');

const reviewFields = 'rating_id, course_id, student_id, rating, review, created_at, updated_at, is_hidden, name, profile_photo';
const reviewOrder = 'created_at DESC NULLS LAST, rating_id DESC';

function reviewInput(body, partial = false) {
  const { rating, review } = body ?? {};
  const hasRating = Object.hasOwn(body ?? {}, 'rating');
  const hasReview = Object.hasOwn(body ?? {}, 'review');
  if ((!partial || hasRating) && (!Number.isInteger(rating) || rating < 1 || rating > 5)) {
    throw new AppError('Choose a whole-number rating from 1 to 5.', 400);
  }
  if (hasReview && review !== null && typeof review !== 'string') {
    throw new AppError('Enter your review as text.', 400);
  }
  if (partial && !hasRating && !hasReview) throw new AppError('Enter a rating or review to update.', 400);
  const comment = review?.trim() || null;
  if (comment?.length > 500 || comment?.includes('\0')) {
    throw new AppError('Use up to 500 characters of plain text for your review.', 400);
  }
  return { rating: rating ?? null, comment, hasReview };
}

exports.getCourseRatings = catchAsync(async (req, res) => {
  const [studentId, role] = actor(req);
  const courseId = id(req.params.course_id, 'Course');
  const pagination = page(req.query);
  const hidden = req.query.hidden === 'true';
  if (hidden && role !== 'admin') throw new AppError('Only admins can view hidden reviews.', 403);

  const { rows: [result] } = await db.query(`
    SELECT c.rating, c.review_count,
      (SELECT to_jsonb(own_review) FROM (
        SELECT ${reviewFields} FROM course_review_entries WHERE course_id = c.course_id AND student_id = $2
      ) own_review) AS my_review,
      COALESCE((
        SELECT jsonb_agg(to_jsonb(items) ORDER BY ${reviewOrder}) FROM (
          SELECT ${reviewFields} FROM course_review_entries
          WHERE course_id = c.course_id AND is_hidden = $3
          ORDER BY ${reviewOrder} LIMIT $4 OFFSET $5
        ) items
      ), '[]'::jsonb) AS reviews
    FROM courses_with_reviews c WHERE c.course_id = $1 AND c.is_deleted IS NOT TRUE`,
  [courseId, studentId, hidden, pagination.limit + 1, pagination.offset]);
  if (!result) throw new AppError('Course not found.', 404);

  const { reviews, my_review, rating, review_count } = result;
  res.json({
    status: 'success',
    data: reviews.slice(0, pagination.limit),
    hasMore: reviews.length > pagination.limit,
    page: pagination.number,
    myReview: my_review,
    summary: { rating, review_count },
  });
});

exports.getAllRatings = catchAsync(async (req, res) => {
  const pagination = page(req.query);
  const { rows } = await db.query(`
    SELECT ${reviewFields} FROM course_review_entries
    WHERE is_hidden IS FALSE AND ($1::uuid IS NULL OR course_id = $1)
    ORDER BY ${reviewOrder} LIMIT $2 OFFSET $3`,
  [optionalId(req.query.course_id, 'Course'), pagination.limit + 1, pagination.offset]);
  sendPage(res, rows, pagination);
});

exports.getRating = catchAsync(async (req, res) => {
  const [userId, role] = actor(req);
  const { rows: [review] } = await db.query(`
    SELECT ${reviewFields} FROM course_review_entries
    WHERE rating_id = $1 AND ($2::uuid IS NULL OR course_id = $2)
      AND (is_hidden IS FALSE OR student_id = $3 OR $4 = 'admin')`,
  [id(req.params.id, 'Review'), optionalId(req.params.course_id, 'Course'), userId, role]);
  if (!review) throw new AppError('Review not found.', 404);
  res.json({ status: 'success', data: review });
});

exports.createRating = catchAsync(async (req, res) => {
  const [studentId] = actor(req);
  const courseId = id(req.params.course_id, 'Course');
  const { rating, comment } = reviewInput(req.body);
  const { rows: [result] } = await db.query(`
    WITH eligible AS (
      SELECT c.course_id FROM courses c JOIN enrollments e ON e.course_id = c.course_id
      WHERE c.course_id = $1 AND e.student_id = $2 AND c.is_deleted IS NOT TRUE FOR SHARE OF c, e
    ), saved AS (
      INSERT INTO ratings (course_id, student_id, rating, review)
      SELECT course_id, $2, $3, $4 FROM eligible
      ON CONFLICT (course_id, student_id) DO NOTHING RETURNING *
    )
    SELECT EXISTS (SELECT 1 FROM eligible) AS eligible,
      (SELECT to_jsonb(saved) FROM saved) AS review`,
  [courseId, studentId, rating, comment]);
  if (!result.eligible) throw new AppError('Enroll in this course before leaving a review.', 403);
  if (!result.review) throw new AppError('You already reviewed this course. Edit your existing review instead.', 409);
  res.status(201).json({ status: 'success', data: result.review });
});

exports.updateRating = catchAsync(async (req, res) => {
  const [studentId] = actor(req);
  const { rating, comment, hasReview } = reviewInput(req.body, true);
  const { rows: [review] } = await db.query(`
    UPDATE ratings r
    SET rating = COALESCE($4, r.rating), review = CASE WHEN $5 THEN $6 ELSE r.review END,
        updated_at = NOW()
    FROM courses c JOIN enrollments e ON e.course_id = c.course_id
    WHERE r.course_id = c.course_id AND c.is_deleted IS NOT TRUE AND e.student_id = $2
      AND r.rating_id = $1 AND r.student_id = $2 AND ($3::uuid IS NULL OR r.course_id = $3)
    RETURNING r.*`,
  [id(req.params.id, 'Review'), studentId, optionalId(req.params.course_id, 'Course'), rating, hasReview, comment]);
  if (!review) throw new AppError('Review not found or unavailable for editing.', 404);
  res.json({ status: 'success', data: review });
});

exports.deleteRating = catchAsync(async (req, res) => {
  const [studentId] = actor(req);
  const { rowCount } = await db.query(`
    DELETE FROM ratings
    WHERE rating_id = $1 AND student_id = $2 AND ($3::uuid IS NULL OR course_id = $3)`,
  [id(req.params.id, 'Review'), studentId, optionalId(req.params.course_id, 'Course')]);
  if (!rowCount) throw new AppError('Review not found.', 404);
  res.sendStatus(204);
});

exports.setRatingVisibility = catchAsync(async (req, res) => {
  const { hidden } = req.body ?? {};
  if (typeof hidden !== 'boolean') throw new AppError('Choose whether to hide or restore this review.', 400);
  const { rowCount } = await db.query(`
    UPDATE ratings r SET is_hidden = $3
    FROM courses c
    WHERE r.course_id = c.course_id AND c.is_deleted IS NOT TRUE AND r.rating_id = $1 AND r.course_id = $2`,
  [id(req.params.id, 'Review'), id(req.params.course_id, 'Course'), hidden]);
  if (!rowCount) throw new AppError('Review not found.', 404);
  res.sendStatus(204);
});
