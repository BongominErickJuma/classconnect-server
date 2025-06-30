const globalController = require('./global.controller');

exports.getAllNotifications = globalController.getAll('notifications');
exports.getNotification = globalController.getOne('notification');
