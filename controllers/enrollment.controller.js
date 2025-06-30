const catchAsync = require('./../utils/catchAsync');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllEnrolments = globalController.getAll('enrolments');
exports.getEnrolment = globalController.getOne('enrolment');
exports.deleteEnrolment = globalController.deleteOne('enrolment');

exports.createEnrolment = catchAsync(async (req, res, next) => {
  const { user_id } = req.body;

  const query = {
    text: `INSERT INTO enrolments (user_id, course_id)
            VALUES ($1, $2) RETURNING *`,
    values: [user_id, req.params.course_id],
  };

  const results = await db.query(query);
  const enrolment = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: enrolment,
  });
});
