const multer = require('multer');
const sharp = require('sharp');

const catchAsync = require('./../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const globalController = require('./global.controller');
const { actor, canManage, id } = require('../utils/assignmentAccess');

const editableCourse = `c.course_id = $3 AND c.is_deleted IS NOT TRUE AND ${canManage}`;
const eligibleInstructor = "u.role IN ('instructor', 'admin') AND u.is_deleted IS NOT TRUE";

function findEditableCourse(params) {
  return db.query(`SELECT 1 FROM courses c WHERE ${editableCourse}`, params);
}

exports.getAllCourses = globalController.getAll('courses_with_reviews');
exports.getCourse = catchAsync(async (req, res) => {
  const { rows: [course] } = await db.query('SELECT * FROM courses_with_reviews WHERE course_id = $1',
    [id(req.params.id, 'Course')]);
  if (!course) throw new AppError('Course not found.', 404);
  res.json({ status: 'success', data: course });
});
exports.trashCourse = globalController.trashOne('course');
exports.deleteCourse = globalController.deleteOne('course');

exports.requireCourseManager = catchAsync(async (req, res, next) => {
  const { rowCount } = await findEditableCourse([...actor(req), id(req.params.id, 'Course')]);
  if (!rowCount) throw new AppError('Course not found or unavailable for editing.', 404);
  next();
});

exports.getEligibleInstructors = catchAsync(async (req, res) => {
  const { rows: data } = await db.query(`
    SELECT u.user_id, u.name, u.email
    FROM users u WHERE ${eligibleInstructor}
    ORDER BY lower(u.name), u.email, u.user_id`);
  res.json({ status: 'success', data });
});

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
    text: `SELECT * FROM courses_with_reviews WHERE course_id IN (${placeholders}) AND is_deleted = false`,
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
    data: { ...course, review_count: 0 },
  });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  if (req.file) {
    req.body.cover_image = `/img/courses/${req.file.filename}`;
  }

  const { title, instructor_id, description, cover_image } = req.body;
  const permission = [...actor(req), id(req.params.id, 'Course')];
  const instructorId = instructor_id == null ? null : id(instructor_id, 'Instructor');

  const query = {
    text: `WITH updated AS (
            UPDATE courses c
            SET
                title = COALESCE($4, c.title),
                instructor_id = COALESCE($5::uuid, c.instructor_id),
                description = COALESCE($6, c.description),
                cover_image = COALESCE($7, c.cover_image),
                updated_at = NOW()
            WHERE ${editableCourse}
              AND ($5::uuid IS NULL OR $5 = c.instructor_id OR EXISTS (
                SELECT 1 FROM users u WHERE u.user_id = $5 AND ${eligibleInstructor} FOR SHARE
              ))
            RETURNING course_id, title, description, instructor_id, cover_image, is_deleted, created_at, updated_at
          )
          SELECT updated.*, summary.rating, COALESCE(summary.review_count, 0) AS review_count,
                 CASE WHEN assigned.user_id IS NOT NULL THEN
                   json_build_object('user_id', assigned.user_id, 'name', assigned.name,
                     'email', assigned.email, 'profile_photo', assigned.profile_photo)
                 END AS instructor
          FROM updated LEFT JOIN course_review_summaries summary USING (course_id)
          LEFT JOIN users assigned ON assigned.user_id = updated.instructor_id AND assigned.is_deleted IS NOT TRUE
    `,
    values: [...permission, title, instructorId, description, cover_image],
  };
  const { rows: [updated] } = await db.query(query);

  if (!updated) {
    const { rowCount } = await findEditableCourse(permission);
    if (!rowCount) return next(new AppError('Course not found or unavailable for editing.', 404));
    return next(new AppError('Choose an active instructor or admin for this course.', 400));
  }

  const { instructor, ...course } = updated;
  res.status(200).json({
    status: 'success',
    data: course,
    instructor,
  });
});
