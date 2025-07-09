const multer = require('multer');
const path = require('path');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllResources = globalController.getAll('resources');
exports.getResurce = globalController.getOne('resource');
exports.trashResource = globalController.trashOne('resource');
exports.deleteResource = globalController.deleteOne('resource');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, `public/assets`);
  },
  filename: function (req, file, cb) {
    const ext = file.mimetype.split('/')[1];
    cb(null, `res-${req.params.course_id}-${Date.now()}.${ext}`);
  },
});

// File filter to allow only specific file types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'video/mp4',
    'video/mpeg',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type'), false);
  }
};

const upload = multer({ storage, fileFilter });

exports.uploadResource = upload.single('file_url');

exports.createResource = catchAsync(async (req, res, next) => {
  const { title, type, link } = req.body;

  const file_url = req.file ? `/assets/${req.file.filename}` : '';

  const query = {
    text: `INSERT INTO resources (course_id, title, type, file_url, link)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    values: [req.params.course_id, title, type, file_url, link],
  };

  const results = await db.query(query);
  const resource = results.rows[0];

  res.status(201).json({
    status: 'success',
    data: resource,
  });
});

exports.updateResource = catchAsync(async (req, res, next) => {
  const { title, type, link } = req.body;

  // Handle either file upload or link (or none)
  const file_url = req.file ? `/assets/${req.file.filename}` : null;

  const query = {
    text: `UPDATE resources
           SET 
               title = COALESCE($1, title),
               type = COALESCE($2, type),
               file_url = COALESCE($3, file_url),
               link = COALESCE($4, link)
           WHERE resource_id = $5
           RETURNING *`,
    values: [title, type, file_url, link, req.params.id],
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
