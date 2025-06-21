const express = require('express');
const answerController = require('./../controllers/resources/AnswerController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .post(
    authController.restrictTo('student'),
    answerController.setAssignmentStudentIds,
    answerController.createAnswer
  )
  .get(
    authController.restrictTo('admin', 'teacher'),
    answerController.getAllAnswers
  );

router
  .route('/:id')
  .get(answerController.getAnswer)
  .patch(authController.restrictTo('student'), answerController.updateAnswer)
  .delete(authController.restrictTo('student'), answerController.deleteAnswer);

module.exports = router;
