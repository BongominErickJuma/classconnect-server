const express = require('express');
const courseController = require('./../controllers/courseController');
const authController = require('./../controllers/authController');
const assignmentRoutes = require('./assignmentRoutes');
const notesRoutes = require('./notesRoutes');
const reviewRoutes = require('./reviewRoutes');

const router = express.Router();

router.use(authController.protect);

// assignments merge
router.use('/:courseId/assignments', assignmentRoutes);
router.use('/assignments', assignmentRoutes);

// notes
router.use('/:courseId/notes', notesRoutes);
router.use('/notes', notesRoutes);

// reviews

router.use('/:courseId/reviews', reviewRoutes);
router.use('/reviews', reviewRoutes);

router
  .route('/')
  .post(authController.restrictTo('admin'), courseController.createCourse)
  .get(courseController.getAllCourses);

router
  .route('/:id')
  .get(courseController.getCourse)
  .patch(authController.restrictTo('admin'), courseController.updateCourse)
  .delete(authController.restrictTo('admin'), courseController.deleteCourse);

module.exports = router;
