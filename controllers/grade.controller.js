const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllGrades = globalController.getAll('grades');
exports.getGrade = globalController.getOne('grade');
exports.deleteGrade = globalController.deleteOne('grade');

exports.createGrade = catchAsync(async (req, res, next) => {
  const { score, feedback, graded_by } = req.body;

  const query = {
    text: `INSERT INTO grades (submission_id, score, feedback, graded_by)
            VALUES ($1, $2, $3 , $4) RETURNING *`,
    values: [req.params.submission_id, score, feedback, graded_by],
  };

  const results = await db.query(query);
  const grade = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: grade,
  });
});

exports.updateGrade = catchAsync(async (req, res, next) => {
  const { score, feedback } = req.body;
  const query = {
    text: `UPDATE grades
            SET 
                score = COALESCE($1, score),
                feedback = COALESCE($2, feedback)
            WHERE grade_id = $3
            RETURNING *
    `,
    values: [score, feedback, req.params.id],
  };
  const results = await db.query(query);
  const grade = results.rows[0];

  if (!grade) {
    return next(new AppError('Grade not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: grade,
  });
});
