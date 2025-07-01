const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const authController = require('../controllers/auth.controller');
const submissionRouter = require('./submission.routes');

const router = express.Router({ mergeParams: true });

// ASSIGNMENT SUBMISSIONS

router.use('/submissions', submissionRouter);
router.use('/:assignment_id/submissions', submissionRouter);

router.delete(
  '/delete-permanently/:id',
  authController.restrictTo('admin'),
  assignmentController.deleteAssignment
);

router
  .route('/')
  .get(assignmentController.getAllAssignments)
  .post(
    authController.restrictTo('admin', 'instructor'),
    assignmentController.createAssignment
  );

router
  .route('/:id')
  .get(assignmentController.getAssignment)
  .patch(
    authController.restrictTo('admin', 'instructor'),
    assignmentController.updateAssignment
  )
  .delete(
    authController.restrictTo('admin', 'instructor'),
    assignmentController.trashAssignment
  );

module.exports = router;
