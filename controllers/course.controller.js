const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllCourses = globalController.getAll('courses');
exports.getCourse = globalController.getOne('course');
exports.trashCourse = globalController.trashOne('course');
exports.deleteCourse = globalController.deleteOne('course');

exports.createCourse = catchAsync(async (req, res, next) => {
  const { title, instructor_id, description } = req.body;

  const query = {
    text: `INSERT INTO courses (title, description, instructor_id)
            VALUES ($1, $2, $3) RETURNING *`,
    values: [title, description, instructor_id],
  };

  const results = await db.query(query);
  const course = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: course,
  });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const { title, instructor_id, description, cover_image } = req.body;
  const query = {
    text: `UPDATE courses
            SET 
                title = COALESCE($1, title),
                instructor_id = COALESCE($2, instructor_id),
                description = COALESCE($3, description),
                cover_image = COALESCE($4, cover_image)
            WHERE course_id = $5
            RETURNING *
    `,
    values: [title, instructor_id, description, cover_image, req.params.id],
  };
  const results = await db.query(query);
  const course = results.rows[0];

  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: course,
  });
});
