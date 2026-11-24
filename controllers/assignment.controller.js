const db = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const validator = require('validator');
const { actor, canManage, canRead, id, optionalId, page, sendPage } = require('../utils/assignmentAccess');
const { requestSubmissionCleanup } = require('../utils/submissionCloudStorage');

const assignmentFields = `
  a.*, ${canManage} AS can_manage,
  CASE WHEN $2 = 'student' THEN
    CASE WHEN g.grade_id IS NOT NULL THEN 'Graded'
         WHEN s.submission_id IS NOT NULL AND a.due_date IS NOT NULL AND s.submitted_at > a.due_date THEN 'Late'
         WHEN s.submission_id IS NOT NULL THEN 'Submitted'
         WHEN a.due_date < NOW() THEN 'Missing'
         ELSE 'Not submitted' END
  END AS student_status`;
const assignmentJoins = `
  FROM assignments a JOIN courses c ON c.course_id = a.course_id
  LEFT JOIN submissions s ON $2 = 'student' AND s.assignment_id = a.assignment_id
    AND s.student_id = $1 AND s.is_deleted IS NOT TRUE
  LEFT JOIN grades g ON g.submission_id = s.submission_id`;

function assignmentInput(body = {}, partial = false) {
  const present = (key) => !partial || Object.hasOwn(body, key);
  const { title, description, due_date, max_score } = body;
  if (present('title') && (typeof title !== 'string' || !title.trim() || title.trim().length > 100)) {
    throw new AppError('Enter a title with 1 to 100 characters.', 400);
  }
  if (description != null && typeof description !== 'string') throw new AppError('Enter assignment instructions as text.', 400);
  if (due_date != null && (typeof due_date !== 'string' || !validator.isISO8601(due_date, { strict: true }))) {
    throw new AppError('Enter a valid deadline.', 400);
  }
  const score = typeof max_score === 'number' || (typeof max_score === 'string' && max_score.trim()) ? Number(max_score) : NaN;
  if (present('max_score') && (!Number.isFinite(score) || score <= 0 || score > 999.99 || Number(score.toFixed(2)) !== score)) {
    throw new AppError('Enter a maximum score between 0.01 and 999.99 with up to two decimal places.', 400);
  }
  return [title?.trim(), description ?? null, due_date ?? null, present('max_score') ? score : null,
    present('description'), present('due_date')];
}

exports.getAllAssignments = catchAsync(async (req, res) => {
  const courseId = optionalId(req.params.course_id ?? req.query.course_id, 'Course');
  const archived = req.query.archived === 'true';
  const pagination = page(req.query);
  const { rows } = await db.query(`
    SELECT ${assignmentFields}, COUNT(*) OVER () AS row_total ${assignmentJoins}
    WHERE c.is_deleted IS NOT TRUE AND ${canRead}
      AND ($3::uuid IS NULL OR a.course_id = $3)
      AND (CASE WHEN $4 THEN a.is_deleted IS TRUE AND ${canManage} ELSE a.is_deleted IS NOT TRUE END)
    ORDER BY a.created_at DESC, a.assignment_id
    LIMIT $5 OFFSET $6`,
    [...actor(req), courseId, archived, pagination.limit + 1, pagination.offset],
  );
  sendPage(res, rows, pagination);
});

exports.getAssignment = catchAsync(async (req, res) => {
  const { rows: [assignment] } = await db.query(`
    SELECT ${assignmentFields} ${assignmentJoins}
    WHERE a.assignment_id = $3 AND ($4::uuid IS NULL OR a.course_id = $4)
      AND c.is_deleted IS NOT TRUE AND ${canRead}
      AND (a.is_deleted IS NOT TRUE OR ${canManage})`,
    [...actor(req), id(req.params.id, 'Assignment'), optionalId(req.params.course_id, 'Course')],
  );
  if (!assignment) throw new AppError('Assignment not found or unavailable.', 404);
  res.json({ status: 'success', data: assignment });
});

exports.createAssignment = catchAsync(async (req, res) => {
  const courseId = id(req.params.course_id, 'Course');
  const [title, description, dueDate, maxScore] = assignmentInput(req.body ?? {});
  const { rows: [assignment] } = await db.query(`
    INSERT INTO assignments (course_id, title, description, due_date, max_score)
    SELECT c.course_id, $4, $5, $6, $7 FROM courses c
    WHERE c.course_id = $3 AND c.is_deleted IS NOT TRUE AND ${canManage}
    RETURNING *`,
    [...actor(req), courseId, title, description, dueDate, maxScore],
  );
  if (!assignment) throw new AppError('Course not found or unavailable for editing.', 404);
  res.status(201).json({ status: 'success', data: assignment });
});

exports.updateAssignment = catchAsync(async (req, res) => {
  const [title, description, dueDate, maxScore, hasDescription, hasDeadline] = assignmentInput(req.body ?? {}, true);
  const { rows: [result] } = await db.query(`
    WITH eligible AS (
      SELECT a.assignment_id FROM assignments a JOIN courses c ON c.course_id = a.course_id
      WHERE c.is_deleted IS NOT TRUE AND ${canManage}
        AND a.assignment_id = $3 AND ($4::uuid IS NULL OR a.course_id = $4) AND a.is_deleted IS NOT TRUE
    ), updated AS (
    UPDATE assignments a SET title = COALESCE($5, a.title),
      description = CASE WHEN $9 THEN $6 ELSE a.description END,
      due_date = CASE WHEN $10 THEN $7 ELSE a.due_date END,
      max_score = COALESCE($8, a.max_score), updated_at = NOW()
    FROM eligible WHERE a.assignment_id = eligible.assignment_id AND a.is_deleted IS NOT TRUE
      AND ($8::numeric IS NULL OR NOT EXISTS (
        SELECT 1 FROM submissions s JOIN grades g ON g.submission_id = s.submission_id
        WHERE s.assignment_id = a.assignment_id AND g.score > $8
      ))
    RETURNING a.*)
    SELECT (SELECT row_to_json(updated) FROM updated) AS assignment,
      EXISTS (SELECT 1 FROM eligible) AS eligible`,
    [...actor(req), id(req.params.id, 'Assignment'), optionalId(req.params.course_id, 'Course'),
      title ?? null, description, dueDate, maxScore, hasDescription, hasDeadline],
  );
  if (!result.eligible) throw new AppError('Assignment not found or unavailable for editing.', 404);
  if (!result.assignment) throw new AppError('The maximum score cannot be below an existing grade.', 409);
  res.json({ status: 'success', data: result.assignment });
});

function setArchived(archived) {
  return catchAsync(async (req, res) => {
    const { rows: [assignment] } = await db.query(`
      UPDATE assignments a SET is_deleted = $5, updated_at = NOW()
      FROM courses c WHERE c.course_id = a.course_id AND c.is_deleted IS NOT TRUE
        AND ${canManage} AND a.assignment_id = $3 AND ($4::uuid IS NULL OR a.course_id = $4)
      RETURNING a.*`,
      [...actor(req), id(req.params.id, 'Assignment'), optionalId(req.params.course_id, 'Course'), archived],
    );
    if (!assignment) throw new AppError('Assignment not found or unavailable.', 404);
    res.json({ status: 'success', data: assignment });
  });
}
exports.trashAssignment = setArchived(true);
exports.restoreAssignment = setArchived(false);

exports.deleteAssignment = catchAsync(async (req, res) => {
  const [userId, role] = actor(req);
  if (role !== 'admin' && role !== 'instructor') {
    throw new AppError('Only course instructors and administrators can permanently delete assignments.', 403);
  }
  const { rowCount } = await db.query(`
    WITH eligible_course AS (
      SELECT c.course_id FROM courses c
      JOIN assignments candidate ON candidate.course_id = c.course_id
      WHERE candidate.assignment_id = $3 AND ($4::uuid IS NULL OR c.course_id = $4)
        AND ${canManage} AND ($2 = 'admin' OR c.is_deleted IS NOT TRUE)
      FOR SHARE OF c
    )
    DELETE FROM assignments a USING eligible_course
    WHERE a.assignment_id = $3 AND a.course_id = eligible_course.course_id AND a.is_deleted IS TRUE`,
    [userId, role, id(req.params.id, 'Assignment'), optionalId(req.params.course_id, 'Course')],
  );
  if (!rowCount) throw new AppError('Archived assignment not found or unavailable.', 404);
  requestSubmissionCleanup(db);
  res.sendStatus(204);
});
