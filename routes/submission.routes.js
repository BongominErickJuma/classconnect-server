const express = require('express');
const submissionController = require('../controllers/submission.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router.use(
  '/delete-permanently/:id',
  authController.restrictTo('admin'),
  submissionController.deleteSubmission
);

router
  .route('/')
  .get(
    authController.restrictTo('admin', 'instructor'),
    submissionController.getAllSubmissions
  )
  .post(
    authController.restrictTo('student'),
    submissionController.createSubmission
  );

router
  .route('/:id')
  .get(submissionController.getSubmission)
  .delete(
    authController.restrictTo('admin', 'instructor'),
    submissionController.trashSubmission
  );

module.exports = router;
