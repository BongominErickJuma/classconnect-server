const express = require('express');
const ratingsController = require('../controllers/rating.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router.get('/course-ratings/:course_id', ratingsController.getCourseRatings);

router
  .route('/')
  .get(ratingsController.getAllRatings)
  .post(authController.restrictTo('student'), ratingsController.createRating);

router
  .route('/:id')
  .get(ratingsController.getRating)
  .patch(authController.restrictTo('student'), ratingsController.updateRating)
  .delete(authController.restrictTo('student'), ratingsController.deleteRating);

module.exports = router;
