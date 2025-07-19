const db = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const globalController = require('./global.controller');

exports.getAllNotifications = globalController.getAll('notifications');
exports.getNotification = globalController.getOne('notification');

exports.readNotification = catchAsync(async (req, res, next) => {
  const query = {
    text: `UPDATE notifications SET read=true WHERE notification_id = $1 RETURNING *`,
    values: [req.params.id],
  };

  const results = await db.query(query);
  const notification = results.rows[0];

  if (!notification) {
    return next(new AppError('Notification not found', 404));
  }

  res.status(200).json({
    status: 'success',
    message: 'notification marked as read',
  });
});
