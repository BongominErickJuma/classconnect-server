const express = require('express');
const courseController = require('../controllers/course.controller');
const authController = require('../controllers/auth.controller');
const assignmentRouter = require('./assignment.routes');
const resourceRouter = require('./resource.routes');
const ratingsRouter = require('./rating.routes');
const enrolmentsRouter = require('./enrollment.routes');
const chapterController = require('../controllers/chapter.controller');

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

router.get('/:course_id/videos', chapterController.getVideos);
router.post('/:course_id/chapters', chapterController.createChapter);
router.patch('/:course_id/chapters/:chapter_id', chapterController.renameChapter);
router.delete('/:course_id/chapters/:chapter_id', chapterController.deleteChapter);
router.post('/:course_id/chapters/:chapter_id/videos', chapterController.addVideo);
router.patch('/:course_id/videos/:resource_id/chapter', chapterController.moveVideo);
router.patch('/:course_id/videos/:resource_id/removal', chapterController.setVideoRemoved);
router.patch('/:course_id/videos/:resource_id/progress', chapterController.saveVideoProgress);
router.delete('/:course_id/videos/:resource_id', chapterController.deleteRemovedVideo);

// COURSE ROUTES

router.delete(
  '/delete-permanently/:id',
  authController.restrictTo('admin'),
  courseController.deleteCourse
);

router.get(
  '/enrolled-courses/:ids',
  courseController.getStudentEnrolledCourses
);

router.get(
  '/:id/eligible-instructors',
  authController.restrictTo('admin', 'instructor'),
  courseController.requireCourseManager,
  courseController.getEligibleInstructors
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
    courseController.requireCourseManager,
    courseController.uploadCourseCover,
    courseController.resizeCoverImage,
    courseController.updateCourse
  )
  .delete(
    authController.restrictTo('admin', 'instructor'),
    courseController.requireCourseManager,
    courseController.trashCourse
  );

module.exports = router;
