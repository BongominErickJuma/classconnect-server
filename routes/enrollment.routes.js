const express = require('express');
const enrolmentController = require('../controllers/enrollment.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router(
  '/delete-permanently',
  authController.restrictTo('admin'),
  enrolmentController.deleteEnrolment
);

router
  .route('/')
  .get(enrolmentController.getAllEnrolments)
  .post(
    authController.restrictTo('student'),
    enrolmentController.createEnrolment
  );

router.route('/:id').get(enrolmentController.getEnrolment);

module.exports = router;
