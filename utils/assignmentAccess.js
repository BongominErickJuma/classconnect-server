const validator = require('validator');
const AppError = require('./appError');

// Scoped assessment queries use c for the course and bind the session user first.
const canManage = `($2 = 'admin' OR ($2 = 'instructor' AND c.instructor_id = $1))`;
const canRead = `(${canManage} OR ($2 = 'student' AND EXISTS (
  SELECT 1 FROM enrollments WHERE course_id = c.course_id AND student_id = $1
)))`;

function actor(req) {
  if (!req.user) throw new AppError('Please sign in again.', 401);
  return [req.user.user_id, req.user.role];
}

function id(value, label) {
  if (typeof value !== 'string' || !validator.isUUID(value)) throw new AppError(`${label} not found.`, 404);
  return value;
}

function optionalId(value, label) {
  return value === undefined ? null : id(value, label);
}

function page(query) {
  const number = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 25);
  if (!Number.isSafeInteger(number) || number < 1 || number > 1_000_000 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError('Choose a valid page and page size.', 400);
  }
  return { number, limit, offset: (number - 1) * limit };
}

function sendPage(res, rows, { number, limit }, total = rows[0]?.row_total) {
  const data = rows.slice(0, limit).map(({ row_total, ...row }) => row);
  res.json({ status: 'success', result: data.length, data, page: number, hasMore: rows.length > limit,
    ...(total !== undefined ? { total: Number(total) } : {}) });
}

module.exports = { actor, canManage, canRead, id, optionalId, page, sendPage };
