const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllAssignments = globalController.getAll('assignments');
exports.getAssignment = globalController.getOne('assignment');
exports.trashAssignment = globalController.trashOne('assignment');
exports.deleteAssignment = globalController.deleteOne('assignment');

exports.createAssignment = catchAsync(async (req, res, next) => {
  const { title, description, due_date, max_score } = req.body;

  const query = {
    text: `INSERT INTO assignments (course_id, title, description, due_date, max_score)
              VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    values: [req.params.course_id, title, description, due_date, max_score],
  };

  const results = await db.query(query);
  const assignment = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: assignment,
  });
});

exports.updateAssignment = catchAsync(async (req, res, next) => {
  const { title, description, due_date, max_score } = req.body;
  const query = {
    text: `UPDATE assignments
            SET 
                title = COALESCE($1, title),
                due_date = COALESCE($2, due_date),
                description = COALESCE($3, description),
                max_score = COALESCE($4, max_score)
            WHERE assignment_id = $5
            RETURNING *
    `,
    values: [title, description, due_date, max_score, req.params.id],
  };
  const results = await db.query(query);
  const assignment = results.rows[0];

  if (!assignment) {
    return next(new AppError('Assignment not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: assignment,
  });
});
