const db = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { actor, canManage, canRead, id, optionalId, page, sendPage } = require('../utils/assignmentAccess');

const fromGrades = `
  FROM grades g JOIN submissions s ON s.submission_id = g.submission_id
  JOIN assignments a ON a.assignment_id = s.assignment_id JOIN courses c ON c.course_id = a.course_id`;
const gradeAccess = `c.is_deleted IS NOT TRUE AND (
  ${canManage} OR ($2 = 'student' AND s.student_id = $1 AND ${canRead}
    AND a.is_deleted IS NOT TRUE AND s.is_deleted IS NOT TRUE)
)`;

exports.getAllGrades = catchAsync(async (req, res) => {
  const pagination = page(req.query);
  const { rows } = await db.query(`
    SELECT g.* ${fromGrades} WHERE ${gradeAccess}
      AND ($3::uuid IS NULL OR g.submission_id = $3)
    ORDER BY g.updated_at DESC, g.grade_id LIMIT $4 OFFSET $5`,
    [...actor(req), optionalId(req.params.submission_id ?? req.query.submission_id, 'Submission'),
      pagination.limit + 1, pagination.offset],
  );
  sendPage(res, rows, pagination);
});

exports.getGrade = catchAsync(async (req, res) => {
  const { rows: [grade] } = await db.query(`
    SELECT g.* ${fromGrades} WHERE ${gradeAccess} AND g.grade_id = $3
      AND ($4::uuid IS NULL OR g.submission_id = $4)`,
    [...actor(req), id(req.params.id, 'Grade'), optionalId(req.params.submission_id, 'Submission')],
  );
  if (!grade) throw new AppError('Grade not found.', 404);
  res.json({ status: 'success', data: grade });
});

function writeGrade(mode) {
  const onConflict = mode === 'create' ? 'DO NOTHING' : `DO UPDATE
    SET score = EXCLUDED.score, feedback = EXCLUDED.feedback,
        graded_by = EXCLUDED.graded_by, updated_at = NOW()`;
  return catchAsync(async (req, res) => {
    const { score: input, feedback } = req.body ?? {};
    const score = typeof input === 'number' || (typeof input === 'string' && input.trim()) ? Number(input) : NaN;
    if ((input !== undefined || mode !== 'update') &&
        (!Number.isFinite(score) || score < 0 || score > 999.99 || Number(score.toFixed(2)) !== score)) {
      throw new AppError('Enter a nonnegative score with up to two decimal places.', 400);
    }
    if (feedback != null && (typeof feedback !== 'string' || feedback.length > 10000)) {
      throw new AppError('Enter feedback as text with at most 10,000 characters.', 400);
    }

    const submissionId = mode === 'update'
      ? optionalId(req.params.submission_id, 'Submission')
      : id(req.params.submission_id, 'Submission');
    const gradeId = mode === 'update' ? id(req.params.id, 'Grade') : null;
    const identity = actor(req);
    if (!['instructor', 'admin'].includes(identity[1])) throw new AppError('Only instructors and administrators can grade work.', 403);
    const { rows: [result] } = await db.query(`
      WITH target AS (
        SELECT s.submission_id, COALESCE(a.max_score, 100) AS max_score,
          COALESCE($5::numeric, prior.score) AS score,
          CASE WHEN $7 THEN $6::text ELSE prior.feedback END AS feedback
        FROM submissions s JOIN assignments a ON a.assignment_id = s.assignment_id
        JOIN courses c ON c.course_id = a.course_id LEFT JOIN grades prior ON prior.submission_id = s.submission_id
        WHERE ${canManage} AND c.is_deleted IS NOT TRUE AND a.is_deleted IS NOT TRUE AND s.is_deleted IS NOT TRUE
          AND ($3::uuid IS NULL OR s.submission_id = $3) AND ($4::uuid IS NULL OR prior.grade_id = $4)
        FOR UPDATE OF a, s
      ), valid AS (
        SELECT submission_id, score, feedback FROM target WHERE score BETWEEN 0 AND max_score
      ), saved AS (
        INSERT INTO grades (submission_id, score, feedback, graded_by)
        SELECT submission_id, score, feedback, $1 FROM valid
        ON CONFLICT (submission_id) ${onConflict}
        RETURNING *
      )
      SELECT (SELECT row_to_json(saved) FROM saved) AS grade, EXISTS (SELECT 1 FROM target) AS allowed,
        EXISTS (SELECT 1 FROM valid) AS valid`,
      [...identity, submissionId, gradeId, Number.isFinite(score) ? score : null, feedback ?? null, feedback !== undefined],
    );
    if (!result.allowed) throw new AppError('Submission or grade not found for this course.', 404);
    if (!result.valid) throw new AppError('The score must be between zero and the assignment maximum.', 400);
    if (!result.grade) throw new AppError('This submission already has a grade.', 409);
    res.status(mode === 'create' ? 201 : 200).json({ status: 'success', data: result.grade });
  });
}

exports.createGrade = writeGrade('create');
exports.saveGrade = writeGrade('upsert');
exports.updateGrade = writeGrade('update');

exports.deleteGrade = catchAsync(async (req, res) => {
  const { rowCount } = await db.query(`
    DELETE FROM grades g USING submissions s
    JOIN assignments a ON a.assignment_id = s.assignment_id JOIN courses c ON c.course_id = a.course_id
    WHERE ${canManage} AND c.is_deleted IS NOT TRUE AND a.is_deleted IS NOT TRUE AND s.is_deleted IS NOT TRUE
      AND g.submission_id = s.submission_id AND g.grade_id = $3
      AND ($4::uuid IS NULL OR g.submission_id = $4)`,
    [...actor(req), id(req.params.id, 'Grade'), optionalId(req.params.submission_id, 'Submission')],
  );
  if (!rowCount) throw new AppError('Grade not found for this course.', 404);
  res.sendStatus(204);
});
