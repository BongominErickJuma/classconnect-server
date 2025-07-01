const express = require('express');
const enrolmentController = require('../controllers/enrollment.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router.use(
  '/delete-permanently/:id',
  authController.restrictTo('admin'),
  enrolmentController.deleteEnrollment
);

router
  .route('/')
  .get(enrolmentController.getAllEnrollments)
  .post(
    authController.restrictTo('student'),
    enrolmentController.createEnrollment
  );

router.route('/:id').get(enrolmentController.getEnrollment);

module.exports = router;
