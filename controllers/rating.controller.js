const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllRatings = globalController.getAll('ratings');
exports.getRating = globalController.getOne('rating');
exports.trashRating = globalController.trashOne('rating');
exports.deleteRating = globalController.deleteOne('rating');

exports.getCourseRatings = catchAsync(async (req, res, next) => {
  const query = {
    text: `
      SELECT 
      r.rating,
      r.review,
      r.created_at,   
      u.name,
      u.profile_photo 
      FROM ratings r
      JOIN users u ON r.student_id = u.user_id
      WHERE r.course_id = $1
      ORDER BY r.created_at DESC
      LIMIT 10
    `,
    values: [req.params.course_id],
  };
  const results = await db.query(query);
  const courseRatings = results.rows;

  res.status(201).json({
    status: 'success',
    data: courseRatings,
  });
});

exports.createRating = catchAsync(async (req, res, next) => {
  const { student_id, rating, review } = req.body;

  const query = {
    text: `INSERT INTO ratings (course_id, student_id, rating, review)
            VALUES ($1, $2, $3, $4) RETURNING *`,
    values: [req.params.course_id, student_id, rating, review],
  };

  const results = await db.query(query);
  const ratingReview = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: ratingReview,
  });
});

exports.updateRating = catchAsync(async (req, res, next) => {
  const { rating, review } = req.body;

  const query = {
    text: `UPDATE ratings
            SET 
                rating = COALESCE($1, rating),
                review = COALESCE($2, review)
            WHERE rating_id = $3
            RETURNING *
    `,
    values: [rating, review, req.params.id],
  };
  const results = await db.query(query);
  const ratingReview = results.rows[0];

  if (!ratingReview) {
    return next(new AppError('Review not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: ratingReview,
  });
});
