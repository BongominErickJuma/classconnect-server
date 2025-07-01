const catchAsync = require('./../utils/catchAsync');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllSubmissions = globalController.getAll('submissions');
exports.getSubmission = globalController.getOne('submission');
exports.trashSubmission = globalController.trashOne('submission');
exports.deleteSubmission = globalController.deleteOne('submission');

exports.createSubmission = catchAsync(async (req, res, next) => {
  const { student_id, submitted_file } = req.body;

  const query = {
    text: `INSERT INTO submissions (assignment_id, student_id, submitted_file)
            VALUES ($1, $2, $3)
            ON CONFLICT (assignment_id, student_id) DO NOTHING RETURNING *
            `,
    values: [req.params.assignment_id, student_id, submitted_file],
  };

  const results = await db.query(query);
  const submission = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: submission,
  });
});
