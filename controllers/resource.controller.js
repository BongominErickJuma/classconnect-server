const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllResources = globalController.getAll('resources');
exports.getResurce = globalController.getOne('resource');
exports.trashResource = globalController.trashOne('resource');
exports.deleteResource = globalController.deleteOne('resource');

exports.createResource = catchAsync(async (req, res, next) => {
  const { title, type, file_url } = req.body;

  const query = {
    text: `INSERT INTO resources (course_id, title, type, file_url )
            VALUES ($1, $2, $3, $4) RETURNING *`,
    values: [req.params.course_id, title, type, file_url],
  };

  const results = await db.query(query);
  const resource = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: resource,
  });
});

exports.updateResource = catchAsync(async (req, res, next) => {
  const { title, type, file_url } = req.body;
  const query = {
    text: `UPDATE resources
            SET 
                title = COALESCE($1, title),
                type = COALESCE($2, type),
                file_url = COALESCE($3, file_url)
            WHERE resource_id = $4
            RETURNING *
    `,
    values: [title, type, file_url, req.params.id],
  };
  const results = await db.query(query);
  const resource = results.rows[0];

  if (!resource) {
    return next(new AppError('Resource not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: resource,
  });
});
