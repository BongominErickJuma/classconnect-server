const db = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const { actor, id, page, sendPage } = require('../utils/assignmentAccess');

exports.getAllNotifications = catchAsync(async (req, res) => {
  const [userId] = actor(req);
  const read = req.query.read ?? null;
  if (read !== null && !['true', 'false'].includes(read)) throw new AppError('Choose a valid read status.', 400);
  const pagination = page({ ...req.query, limit: req.query.limit ?? 100 });
  const { rows } = await db.query(`
    SELECT * FROM notifications WHERE user_id = $1 AND ($2::boolean IS NULL OR read = $2)
    ORDER BY created_at DESC, notification_id LIMIT $3 OFFSET $4`,
    [userId, read, pagination.limit + 1, pagination.offset],
  );
  sendPage(res, rows, pagination);
});

exports.getNotification = catchAsync(async (req, res) => {
  const [userId] = actor(req);
  const { rows: [notification] } = await db.query(
    'SELECT * FROM notifications WHERE notification_id = $1 AND user_id = $2',
    [id(req.params.id, 'Notification'), userId],
  );
  if (!notification) throw new AppError('Notification not found.', 404);
  res.json({ status: 'success', data: notification });
});

exports.readNotification = catchAsync(async (req, res) => {
  const [userId] = actor(req);
  const { rowCount } = await db.query(
    'UPDATE notifications SET read = TRUE WHERE notification_id = $1 AND user_id = $2',
    [id(req.params.id, 'Notification'), userId],
  );
  if (!rowCount) throw new AppError('Notification not found.', 404);
  res.json({ status: 'success', message: 'Notification marked as read.' });
});
