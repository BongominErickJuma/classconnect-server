const multer = require('multer');
const sharp = require('sharp');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');

exports.getAllCourses = globalController.getAll('courses');
exports.getCourse = globalController.getOne('course');
exports.trashCourse = globalController.trashOne('course');
exports.deleteCourse = globalController.deleteOne('course');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('Not an Image, provide an image for the cover', 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadCourseCover = upload.single('cover_image');

exports.resizeCoverImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  req.file.filename = `course-${req.params.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(800, 450)
    .toFormat('jpeg')
    .jpeg({ quality: 80 })
    .toFile(`public/img/courses/${req.file.filename}`);

  next();
});

exports.getStudentEnrolledCourses = catchAsync(async (req, res, next) => {
  const idsParam = req.params.ids;

  if (!idsParam) {
    return next(new AppError('No course IDs provided', 400));
  }

  const courseIds = idsParam.split(','); // ['abc123', 'def456', ...]

  if (courseIds.length === 0) {
    return next(new AppError('Invalid course ID list', 400));
  }

  // Dynamically build placeholders: $1, $2, ...
  const placeholders = courseIds.map((_, i) => `$${i + 1}`).join(', ');

  const query = {
    text: `SELECT * FROM courses WHERE course_id IN (${placeholders}) AND is_deleted = false`,
    values: courseIds,
  };

  const results = await db.query(query);

  if (results.rows.length === 0) {
    return next(new AppError('No courses found for provided IDs', 404));
  }

  res.status(200).json({
    status: 'success',
    count: results.rows.length,
    data: results.rows,
  });
});

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
  if (req.file) {
    req.body.cover_image = `/img/courses/${req.file.filename}`;
  }

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
