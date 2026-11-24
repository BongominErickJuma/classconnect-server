const multer = require('multer');
const streamifier = require('streamifier');
const path = require('path');
const validator = require('validator');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const cloudinary = require('../config/cloudinary');
const globalController = require('./global.controller');
const PostgresAPIFeatures = require('../utils/postgresAPIFeatures');
const { actor, canRead, id: requireId, optionalId } = require('../utils/assignmentAccess');

// ================================
// Basic GET/DELETE Controllers
// ================================
const noteTypes = "type IN ('pdf', 'document')";
const noteFiles = `${noteTypes} AND NULLIF(BTRIM(file_url), '') IS NOT NULL`;
const noteFields = 'resource_id, course_id, title, type, file_url, is_deleted, created_at, updated_at';
const noteFilters = new Set(['resource_id', 'course_id', 'title', 'type', 'is_deleted', 'created_at', 'updated_at']);

exports.getAllResources = catchAsync(async (req, res) => {
  const query = { ...req.query };
  if (req.params.course_id) query.course_id = req.params.course_id;
  const features = new PostgresAPIFeatures(query, noteFilters).filter().sort().paginate();
  features.fields = noteFields;
  features.whereClauses.push(noteFiles);
  const { sql, params } = features.build('resources');
  const { rows } = await db.query(sql, params);
  res.json({ status: 'success', result: rows.length, data: rows });
});

exports.getResource = catchAsync(async (req, res) => {
  const { id, course_id: courseId } = req.params;
  if (!validator.isUUID(id) || (courseId && !validator.isUUID(courseId))) {
    throw new AppError('Note not found.', 404);
  }
  const { rows: [note] } = await db.query(
    `SELECT ${noteFields} FROM resources WHERE resource_id = $1 AND ${noteFiles}
      AND ($2::uuid IS NULL OR course_id = $2)`,
    [id, courseId ?? null],
  );
  if (!note) throw new AppError('Note not found.', 404);
  res.json({ status: 'success', data: note });
});

function noteDeliveryLocation(fileUrl) {
  const relativeBase = 'https://classconnect.invalid';
  let url;
  try { url = new URL(fileUrl, relativeBase); } catch {
    throw new AppError('The file for this note is unavailable.', 404);
  }
  if (url.origin === relativeBase) {
    if (fileUrl.startsWith('/') && !url.pathname.startsWith('//')) return url.pathname + url.search;
    throw new AppError('The file for this note is unavailable.', 404);
  }
  if (!/^https?:\/\//i.test(fileUrl) || url.username || url.password) {
    throw new AppError('The file for this note is unavailable.', 404);
  }

  if (url.origin !== 'https://res.cloudinary.com' || !url.pathname.toLowerCase().endsWith('.pdf')) return url.href;
  const [cloud, resourceType, deliveryType, version, ...asset] = url.pathname.split('/').slice(1);
  if (cloud !== cloudinary.config().cloud_name || resourceType !== 'image' ||
      !['upload', 'private', 'authenticated'].includes(deliveryType) || !/^v\d+$/.test(version ?? '') || !asset.length) {
    return url.href;
  }

  let publicId;
  try { publicId = asset.map(decodeURIComponent).join('/').slice(0, -4); } catch {
    throw new AppError('The file for this note is unavailable.', 404);
  }
  if (!publicId) throw new AppError('The file for this note is unavailable.', 404);

  return cloudinary.utils.private_download_url(publicId, 'pdf', {
    resource_type: resourceType,
    type: deliveryType,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
}

exports.openNote = catchAsync(async (req, res) => {
  const { rows: [note] } = await db.query(
    `SELECT r.file_url FROM resources r JOIN courses c ON c.course_id = r.course_id
     WHERE r.resource_id = $3 AND ($4::uuid IS NULL OR r.course_id = $4)
       AND r.type IN ('pdf', 'document') AND NULLIF(BTRIM(r.file_url), '') IS NOT NULL
       AND r.is_deleted IS NOT TRUE AND c.is_deleted IS NOT TRUE AND ${canRead}`,
    [...actor(req), requireId(req.params.id, 'Note'), optionalId(req.params.course_id, 'Course')],
  );
  if (!note) throw new AppError('Note not found or unavailable.', 404);
  res.set('Cache-Control', 'private, no-store');
  res.set('Referrer-Policy', 'no-referrer');
  res.redirect(noteDeliveryLocation(note.file_url));
});
exports.trashResource = globalController.trashOne('resource');

exports.authorizeResourceWrite = catchAsync(async (req, res, next) => {
  const { course_id, id } = req.params;
  if (!validator.isUUID(id || course_id || '')) {
    throw new AppError('Course or resource not found.', 404);
  }

  const { rows: [course] } = id
    ? await db.query(
      `SELECT c.course_id, c.instructor_id FROM courses c
       JOIN resources r ON r.course_id = c.course_id
       WHERE r.resource_id = $1 AND r.type IN ('pdf', 'document') AND c.is_deleted IS NOT TRUE`,
      [id],
    )
    : await db.query(
      'SELECT course_id, instructor_id FROM courses WHERE course_id = $1 AND is_deleted IS NOT TRUE',
      [course_id],
    );
  if (!course || (course_id && course.course_id !== course_id)) {
    throw new AppError('Course or resource not found.', 404);
  }
  if (req.user.role !== 'admin' && course.instructor_id !== req.user.user_id) {
    throw new AppError('Only course managers can make this change.', 403);
  }
  next();
});

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

function noteTitle(body = {}, required = false) {
  if (Object.hasOwn(body, 'link') || (body.type !== undefined && !['pdf', 'document'].includes(body.type))) {
    throw new AppError('Upload a document for this note.', 400);
  }
  if (body.title === undefined && !required) return null;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (!title || title.length > 100) throw new AppError('Enter a note title with 1 to 100 characters.', 400);
  return title;
}

function uploadedNoteType(file) {
  return file.mimetype === 'application/pdf' ? 'pdf' : 'document';
}

// ================================
// Create Resource
// ================================
exports.createResource = catchAsync(async (req, res) => {
  const title = noteTitle(req.body ?? {}, true);
  if (!req.file?.size) throw new AppError('Choose a nonempty document to upload.', 400);

  const courseId = req.params.course_id;
  const publicId = `res-${courseId}-${Date.now()}`;
  const upload = await uploadToCloudinary(req.file.buffer, req.file.originalname, publicId);
  const { rows: [note] } = await db.query(
    `INSERT INTO resources (course_id, title, type, file_url)
      VALUES ($1, $2, $3, $4) RETURNING ${noteFields}`,
    [courseId, title, uploadedNoteType(req.file), upload.secure_url],
  );
  res.status(201).json({ status: 'success', data: note });
});

// ================================
// Update Resource
// ================================
exports.updateResource = catchAsync(async (req, res, next) => {
  const title = noteTitle(req.body ?? {});
  let fileUrl = null;
  let type = null;

  const currentResource = await db.query(
    `SELECT ${noteFields} FROM resources WHERE resource_id = $1 AND ${noteTypes}`,
    [req.params.id]
  );

  const current = currentResource.rows[0];
  if (!current) {
    return next(new AppError('Note not found.', 404));
  }
  if ((req.file && !req.file.size) || (!req.file && !current.file_url?.trim())) {
    throw new AppError('Choose a nonempty document to upload.', 400);
  }

  if (req.file) {
    const publicId = `res-${current.course_id}-${Date.now()}`;
    const result = await uploadToCloudinary(
      req.file.buffer,
      req.file.originalname,
      publicId
    );
    fileUrl = result.secure_url;
    type = uploadedNoteType(req.file);
  }

  const query = {
    text: `UPDATE resources
           SET 
             title = COALESCE($1, title),
             type = COALESCE($2, type),
             file_url = COALESCE($3, file_url),
             updated_at = NOW()
           WHERE resource_id = $4 AND ${noteTypes}
           RETURNING ${noteFields}`,
    values: [title, type, fileUrl, req.params.id],
  };

  const results = await db.query(query);
  const updated = results.rows[0];

  if (!updated) {
    return next(new AppError('Note not found.', 404));
  }

  if (fileUrl && current.file_url && fileUrl !== current.file_url) {
    try {
      const oldPublicId = extractPublicId(current.file_url);
      await cloudinary.uploader.destroy(`resources/${oldPublicId}`, { resource_type: 'raw' });
    } catch (err) {
      console.error('Error deleting old file from Cloudinary:', err);
    }
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
