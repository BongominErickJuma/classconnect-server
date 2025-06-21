const express = require('express');
const assignmentController = require('./../controllers/resources/assignmentController');
const authController = require('./../controllers/authController');
const answerRoutes = require('./answerRoutes');

const router = express.Router({ mergeParams: true });

// assignments merge
router.use('/:assignmentId/answers', answerRoutes);
router.use('/answers', answerRoutes);

router
  .route('/')
  .post(
    authController.restrictTo('teacher', 'admin'),
    assignmentController.setCourseId,
    assignmentController.createAssignment
  )
  .get(assignmentController.getAllAssignments);

router
  .route('/:id')
  .get(assignmentController.getAssignment)
  .patch(
    authController.restrictTo('teacher', 'admin'),
    assignmentController.updateAssignment
  )
  .delete(
    authController.restrictTo('teacher', 'admin'),
    assignmentController.deleteAssignment
  );

module.exports = router;
