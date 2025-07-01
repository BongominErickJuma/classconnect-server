const express = require('express');
const ratingsController = require('../controllers/rating.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router(
  '/delete-permanently',
  authController.restrictTo('admin'),
  ratingsController.deleteRating
);

router
  .route('/')
  .get(ratingsController.getAllRatings)
  .post(authController.restrictTo('student'), ratingsController.createRating);

router
  .route('/:id')
  .get(ratingsController.getRating)
  .patch(authController.restrictTo('student'), ratingsController.updateRating)
  .delete(
    authController.restrictTo('admin', 'student'),
    ratingsController.trashRating
  );

module.exports = router;
