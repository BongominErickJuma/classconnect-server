const express = require('express');
const gradesController = require('../controllers/grade.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router(
  '/delete-permanently',
  authController.restrictTo('admin', 'instructer'),
  gradesController.deleteGrade
);

router
  .route('/')
  .get(gradesController.getAllGrades)
  .post(
    authController.restrictTo('instructor', 'admin'),
    gradesController.createGrade
  );

router
  .route('/:id')
  .get(gradesController.getGrade)
  .patch(
    authController.restrictTo('instructor', 'admin'),
    gradesController.updateGrade
  );

module.exports = router;
