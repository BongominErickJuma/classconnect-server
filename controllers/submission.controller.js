const multer = require('multer');
const db = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { actor, canManage, canRead, id, optionalId, page, sendPage } = require('../utils/assignmentAccess');
const { maxFileSize, readCloudinarySubmission, requestSubmissionCleanup,
  withCloudinarySubmission } = require('../utils/submissionCloudStorage');

const canReadSubmission = `(${canManage} OR ($2 = 'student' AND s.student_id = $1 AND ${canRead}))`;
const fromSubmissions = `
  FROM submissions s JOIN assignments a ON a.assignment_id = s.assignment_id
  JOIN courses c ON c.course_id = a.course_id JOIN users student ON student.user_id = s.student_id
  LEFT JOIN grades g ON g.submission_id = s.submission_id
  LEFT JOIN submission_files f ON f.submission_id = s.submission_id`;
const submissionStatus = `CASE WHEN g.grade_id IS NOT NULL THEN 'Graded'
  WHEN s.submitted_at > a.due_date THEN 'Late' ELSE 'Submitted' END`;
const submissionFields = `
  s.submission_id, s.assignment_id, s.student_id, s.submitted_at, s.is_deleted,
  student.name AS student_name, f.filename, f.submission_id IS NOT NULL AS has_file,
  s.submitted_file AS legacy_file_url, g.grade_id, g.score, g.feedback,
  COALESCE(s.submitted_at > a.due_date, FALSE) AS is_late, ${submissionStatus} AS status`;

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxFileSize, files: 1, fields: 0 } }).single('file');

exports.requireSubmissionAccess = catchAsync(async (req, res, next) => {
  const [studentId, role] = actor(req);
  if (role !== 'student') throw new AppError('Only enrolled students can submit work.', 403);
  const { rowCount } = await db.query(`
    SELECT 1 FROM assignments a JOIN courses c ON c.course_id = a.course_id
    WHERE a.assignment_id = $3 AND ($4::uuid IS NULL OR a.course_id = $4)
      AND c.is_deleted IS NOT TRUE AND a.is_deleted IS NOT TRUE AND ${canRead}`,
    [studentId, role, id(req.params.assignment_id, 'Assignment'), optionalId(req.params.course_id, 'Course')],
  );
  if (!rowCount) throw new AppError('Assignment not found or unavailable.', 404);
  next();
});

exports.uploadSubmission = (req, res, next) => {
  upload(req, res, (error) => {
    if (error?.code === 'LIMIT_FILE_SIZE') return next(new AppError('Choose a file that is 10 MB or smaller.', 413));
    if (error) return next(new AppError('Upload exactly one file using the file field.', 400));
    next();
  });
};

function submittedFile(req) {
  if (!req.file?.size) throw new AppError('Choose a nonempty file to submit.', 400);
  const filename = req.file.originalname.normalize('NFC')
    .split(/[\\/]/).pop().replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 200);
  return [filename || 'submission', req.file.buffer];
}

function cleanSubmission(row) {
  if (!row.legacy_file_url) return row;
  let url;
  try { url = new URL(row.legacy_file_url); } catch { return { ...row, legacy_file_url: null }; }
  return { ...row, legacy_file_url: ['http:', 'https:'].includes(url.protocol) ? url.href : null };
}

exports.getAllSubmissions = catchAsync(async (req, res) => {
  const pagination = page(req.query);
  const status = req.query.status ?? null;
  if (status !== null && !['Submitted', 'Late', 'Graded'].includes(status)) {
    throw new AppError('Choose a valid submission status.', 400);
  }
  const { rows } = await db.query(`
    SELECT ${submissionFields}, COUNT(*) OVER () AS row_total ${fromSubmissions}
    WHERE ${canReadSubmission} AND c.is_deleted IS NOT TRUE
      AND (a.is_deleted IS NOT TRUE OR ${canManage})
      AND ($3::uuid IS NULL OR s.assignment_id = $3)
      AND ($4::uuid IS NULL OR a.course_id = $4)
      AND ($5::uuid IS NULL OR s.student_id = $5)
      AND (CASE WHEN $6 THEN s.is_deleted IS TRUE AND ${canManage} ELSE s.is_deleted IS NOT TRUE END)
      AND ($7::text IS NULL OR ${submissionStatus} = $7)
    ORDER BY s.submitted_at DESC, s.submission_id LIMIT $8 OFFSET $9`,
    [...actor(req), optionalId(req.params.assignment_id ?? req.query.assignment_id, 'Assignment'),
      optionalId(req.params.course_id ?? req.query.course_id, 'Course'), optionalId(req.query.student_id, 'Student'),
      req.query.archived === 'true', status, pagination.limit + 1, pagination.offset],
  );
  sendPage(res, rows.map(cleanSubmission), pagination);
});

function submissionById(req, fields) {
  return db.query(`
    SELECT ${fields} ${fromSubmissions}
    WHERE ${canReadSubmission} AND c.is_deleted IS NOT TRUE
      AND ((a.is_deleted IS NOT TRUE AND s.is_deleted IS NOT TRUE) OR ${canManage})
      AND s.submission_id = $3 AND ($4::uuid IS NULL OR s.assignment_id = $4)
      AND ($5::uuid IS NULL OR a.course_id = $5)`,
    [...actor(req), id(req.params.id, 'Submission'), optionalId(req.params.assignment_id, 'Assignment'),
      optionalId(req.params.course_id, 'Course')],
  );
}

exports.getSubmission = catchAsync(async (req, res) => {
  const { rows: [submission] } = await submissionById(req, submissionFields);
  if (!submission) throw new AppError('Submission not found.', 404);
  res.json({ status: 'success', data: cleanSubmission(submission) });
});

exports.downloadSubmission = catchAsync(async (req, res) => {
  const { rows: [file] } = await submissionById(req, 'f.filename, f.contents, f.cloudinary_public_id');
  if (!file?.filename) throw new AppError('Submission file not found.', 404);
  const contents = file.cloudinary_public_id
    ? await readCloudinarySubmission(file.cloudinary_public_id)
    : file.contents;
  res.set('Cache-Control', 'private, no-store');
  res.set('X-Content-Type-Options', 'nosniff');
  res.attachment(file.filename).type('application/octet-stream').send(contents);
});

function saveSubmission(replace) {
  const write = replace
    ? `UPDATE submissions s SET submitted_at = clock_timestamp(), submitted_file = NULL FROM allowed
       WHERE s.assignment_id = allowed.assignment_id AND s.student_id = $1 AND s.is_deleted IS NOT TRUE
         AND NOT EXISTS (SELECT 1 FROM grades WHERE submission_id = s.submission_id)
       RETURNING s.*`
    : `INSERT INTO submissions (assignment_id, student_id, submitted_at)
       SELECT assignment_id, $1, clock_timestamp() FROM allowed ON CONFLICT (assignment_id, student_id) DO NOTHING
       RETURNING *`;
  return catchAsync(async (req, res) => {
    const [filename, contents] = submittedFile(req);
    const submission = await withCloudinarySubmission(db, filename, contents, async (publicId) => {
      const { rows: [saved] } = await db.query(`
        WITH allowed AS (
          SELECT a.assignment_id, a.due_date FROM assignments a JOIN courses c ON c.course_id = a.course_id
          WHERE a.assignment_id = $3 AND ($4::uuid IS NULL OR a.course_id = $4)
            AND $2 = 'student' AND ${canRead} AND a.is_deleted IS NOT TRUE AND c.is_deleted IS NOT TRUE
          FOR UPDATE OF a
        ), saved AS (${write}), file AS (
          INSERT INTO submission_files (submission_id, filename, cloudinary_public_id)
          SELECT submission_id, $5, $6 FROM saved
          ON CONFLICT (submission_id) DO UPDATE SET filename = EXCLUDED.filename,
            cloudinary_public_id = EXCLUDED.cloudinary_public_id, contents = NULL
          RETURNING submission_id, filename
        )
        SELECT saved.submission_id, saved.assignment_id, saved.student_id, saved.submitted_at,
          file.filename, TRUE AS has_file, NULL::text AS legacy_file_url,
          CASE WHEN saved.submitted_at > allowed.due_date THEN 'Late' ELSE 'Submitted' END AS status
        FROM saved JOIN file USING (submission_id) JOIN allowed USING (assignment_id)`,
        [...actor(req), id(req.params.assignment_id, 'Assignment'), optionalId(req.params.course_id, 'Course'),
          filename, publicId],
      );
      if (!saved) throw new AppError(replace
        ? 'This submission can no longer be replaced. Contact your instructor if you need to make a change.'
        : 'This assignment is unavailable or already has a submission. Refresh or contact your instructor if your work is not shown.', 409);
      return saved;
    });
    res.status(replace ? 200 : 201).json({ status: 'success', data: submission });
  });
}
exports.createSubmission = saveSubmission(false);
exports.replaceSubmission = saveSubmission(true);

function setArchived(archived) {
  return catchAsync(async (req, res) => {
    const { rowCount } = await db.query(`
      UPDATE submissions s SET is_deleted = $6
      FROM assignments a JOIN courses c ON c.course_id = a.course_id
      WHERE a.assignment_id = s.assignment_id AND ${canManage}
        AND a.is_deleted IS NOT TRUE AND c.is_deleted IS NOT TRUE
        AND s.submission_id = $3 AND ($4::uuid IS NULL OR s.assignment_id = $4)
        AND ($5::uuid IS NULL OR a.course_id = $5)`,
      [...actor(req), id(req.params.id, 'Submission'), optionalId(req.params.assignment_id, 'Assignment'),
        optionalId(req.params.course_id, 'Course'), archived],
    );
    if (!rowCount) throw new AppError('Submission not found or unavailable.', 404);
    res.sendStatus(204);
  });
}
exports.trashSubmission = setArchived(true);
exports.restoreSubmission = setArchived(false);

exports.deleteSubmission = catchAsync(async (req, res) => {
  const [, role] = actor(req);
  if (role !== 'admin') throw new AppError('Only administrators can permanently delete submissions.', 403);
  const { rowCount } = await db.query(`
    DELETE FROM submissions s USING assignments a
    WHERE s.assignment_id = a.assignment_id AND s.submission_id = $1 AND s.is_deleted IS TRUE
      AND ($2::uuid IS NULL OR s.assignment_id = $2) AND ($3::uuid IS NULL OR a.course_id = $3)`,
    [id(req.params.id, 'Submission'), optionalId(req.params.assignment_id, 'Assignment'), optionalId(req.params.course_id, 'Course')],
  );
  if (!rowCount) throw new AppError('Archived submission not found.', 404);
  requestSubmissionCleanup(db);
  res.sendStatus(204);
});
