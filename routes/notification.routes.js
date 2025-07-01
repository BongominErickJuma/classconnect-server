const express = require('express');
const notificationsController = require('../controllers/notification.controller');

const router = express.Router();

router.route('/').get(notificationsController.getAllNotifications);

router.route('/:id').get(notificationsController.getNotification);

module.exports = router;
