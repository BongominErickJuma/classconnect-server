const express = require('express');
const courseController = require('../controllers/course.controller');
const authController = require('../controllers/auth.controller');
const assignmentRouter = require('./assignment.routes');
const resourceRouter = require('./resource.routes');

const router = express.Router();

router.use(authController.protect);

// COURSE ASSIGNMENTS

router.use('/assignments', assignmentRouter);
router.use('/:course_id/assignments', assignmentRouter);

// COURSE RESOURCES

router.use('/resources', resourceRouter);
router.use('/:course_id/resources', resourceRouter);

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
