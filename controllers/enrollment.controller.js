const catchAsync = require('./../utils/catchAsync');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllEnrollments = globalController.getAll('enrollments');
exports.getEnrollment = globalController.getOne('enrollment');
exports.deleteEnrollment = globalController.deleteOne('enrollment');

exports.createEnrollment = catchAsync(async (req, res, next) => {
  const { student_id } = req.body;

  const query = {
    text: `INSERT INTO enrollments (student_id, course_id) VALUES ($1, $2) RETURNING *`,
    values: [student_id, req.params.course_id],
  };

  console.log(query);
  const results = await db.query(query);
  const enrollment = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: enrollment,
  });
});
