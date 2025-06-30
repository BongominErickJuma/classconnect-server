const express = require('express');
const assignmentController = require('../controllers/assignment.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

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
