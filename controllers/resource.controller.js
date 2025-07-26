const multer = require('multer');
const streamifier = require('streamifier');
const path = require('path');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');
const globalController = require('./global.controller');

// ================================
// Basic GET/DELETE Controllers
// ================================
exports.getAllResources = globalController.getAll('resources');
exports.getResurce = globalController.getOne('resource');
exports.trashResource = globalController.trashOne('resource');
exports.deleteResource = globalController.deleteOne('resource');

// ================================
// Multer setup (memory storage)
// ================================
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file type', 400), false);
  }
};

exports.uploadResource = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
}).single('file_url');

// ================================
// Helpers
// ================================
const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case '.ppt':
      return 'application/vnd.ms-powerpoint';
    case '.pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case '.txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
};

const uploadToCloudinary = (buffer, originalname, publicId) => {
  const contentType = getContentType(originalname);

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'resources',
        public_id: publicId,
        resource_type: 'auto',
        content_type: contentType,
        content_disposition: 'inline',
        context: `filename=${originalname}`,
      },
      (error, result) => {
        if (error) return reject(new AppError('File upload failed', 500));
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

const extractPublicId = (url) => {
  const parts = url.split('/');
  const filename = parts[parts.length - 1];
  return filename.substring(0, filename.lastIndexOf('.'));
};

// ================================
// Create Resource
// ================================
exports.createResource = catchAsync(async (req, res, next) => {
  const { title, type, link } = req.body;
  let file_url = null;
  // Optional: let cloudinary_id = null;

  if (req.file) {
    const publicId = `res-${req.params.course_id}-${Date.now()}`;
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      publicId
    );
    file_url = result.secure_url;
    // Optional: cloudinary_id = result.public_id;
  }

  if (!file_url && !link) {
    return next(new AppError('Either a file or link must be provided', 400));
  }

  const query = {
    text: `INSERT INTO resources (course_id, title, type, file_url, link)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    values: [req.params.course_id, title, type, file_url, link],
  };

  const results = await db.query(query);

  res.status(201).json({
    status: 'success',
    data: results.rows[0],
  });
});

// ================================
// Update Resource
// ================================
exports.updateResource = catchAsync(async (req, res, next) => {
  const { title, type, link } = req.body;
  let file_url = null;

  const currentResource = await db.query(
    'SELECT * FROM resources WHERE resource_id = $1',
    [req.params.id]
  );

  if (!currentResource.rows[0]) {
    return next(new AppError('Resource not found', 404));
  }

  if (req.file) {
    const publicId = `res-${req.params.course_id}-${Date.now()}`;
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      publicId
    );
    file_url = result.secure_url;

    if (currentResource.rows[0].file_url) {
      try {
        const oldPublicId = extractPublicId(currentResource.rows[0].file_url);
        await cloudinary.uploader.destroy(`resources/${oldPublicId}`, {
          resource_type: 'raw',
        });
      } catch (err) {
        console.error('Error deleting old file from Cloudinary:', err);
      }
    }
  }

  const query = {
    text: `UPDATE resources
           SET 
             title = COALESCE($1, title),
             type = COALESCE($2, type),
             file_url = CASE WHEN $3::text IS NULL THEN file_url ELSE $3 END,
             link = COALESCE($4, link)
           WHERE resource_id = $5
           RETURNING *`,
    values: [title, type, file_url, link, req.params.id],
  };

  const results = await db.query(query);
  const updated = results.rows[0];

  if (!updated) {
    return next(new AppError('Resource not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: updated,
  });
});

// ================================
// Delete Resource (with Cloudinary cleanup)
// ================================
exports.deleteResource = catchAsync(async (req, res, next) => {
  const result = await db.query(
    'SELECT * FROM resources WHERE resource_id = $1',
    [req.params.id]
  );

  if (!result.rows[0]) {
    return next(new AppError('Resource not found', 404));
  }

  const resource = result.rows[0];

  if (resource.file_url) {
    try {
      const publicId = extractPublicId(resource.file_url);
      await cloudinary.uploader.destroy(`resources/${publicId}`, {
        resource_type: 'raw',
      });
    } catch (err) {
      console.error('Error deleting file from Cloudinary:', err);
    }
  }

  await db.query('DELETE FROM resources WHERE resource_id = $1', [
    req.params.id,
  ]);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
