const express = require('express');
const courseController = require('../controllers/course.controller');
const authController = require('../controllers/auth.controller');
const assignmentRouter = require('./assignment.routes');
const resourceRouter = require('./resource.routes');
const ratingsRouter = require('./rating.routes');
const enrolmentsRouter = require('./enrollment.routes');

const router = express.Router();

router.use(authController.protect);

// COURSE ASSIGNMENTS

router.use('/assignments', assignmentRouter);
router.use('/:course_id/assignments', assignmentRouter);

// COURSE RESOURCES

router.use('/resources', resourceRouter);
router.use('/:course_id/resources', resourceRouter);

// RATING THE COURSE

router.use('/ratings', ratingsRouter);
router.use('/:course_id/ratings', ratingsRouter);

// COURSE ENROLMENTS

router.use('/enrollments', enrolmentsRouter);
router.use('/:course_id/enrollments', enrolmentsRouter);

// COURSE ROUTES

router.delete(
  '/delete-permanently/:id',
  authController.restrictTo('admin'),
  courseController.deleteCourse
);

router
  .route('/')
  .get(courseController.getAllCourses)
  .post(
    authController.restrictTo('admin', 'instructor'),
    courseController.createCourse
  );

router
  .route('/:id')
  .get(courseController.getCourse)
  .patch(
    authController.restrictTo('admin', 'instructor'),
    courseController.updateCourse
  )
  .delete(
    authController.restrictTo('admin', 'instructor'),
    courseController.trashCourse
  );

module.exports = router;
