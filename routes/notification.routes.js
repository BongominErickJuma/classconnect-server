const express = require('express');
const notificationsController = require('../controllers/notification.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router();

router.use(authController.protect);

router.route('/').get(notificationsController.getAllNotifications);

router
  .route('/:id')
  .get(notificationsController.getNotification)
  .patch(notificationsController.readNotification);

module.exports = router;
