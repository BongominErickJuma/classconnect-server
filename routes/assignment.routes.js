const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const submissionRouter = require('./submission.routes');

const router = express.Router({ mergeParams: true });

// ASSIGNMENT SUBMISSIONS

router.use('/submissions', submissionRouter);
router.use('/:assignment_id/submissions', submissionRouter);

router.delete(
  '/delete-permanently/:id',
  assignmentController.deleteAssignment
);
router.patch('/:id/restore', assignmentController.restoreAssignment);

router
  .route('/')
  .get(assignmentController.getAllAssignments)
  .post(assignmentController.createAssignment);

router
  .route('/:id')
  .get(assignmentController.getAssignment)
  .patch(assignmentController.updateAssignment)
  .delete(assignmentController.trashAssignment);

module.exports = router;
