const Review = require('./../models/reviewModel');
const handlerFactory = require('./handlerFactory');

exports.setCourseUserIds = (req, res, next) => {
  // Allow nested Routes
  if (!req.body.course) req.body.course = req.params.courseId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

exports.createReview = handlerFactory.createOne(Review);
exports.getAllReviews = handlerFactory.getAll(Review);
exports.getReview = handlerFactory.getOne(Review);
exports.updateReview = handlerFactory.updateOne(Review);
exports.deleteReview = handlerFactory.deleteOne(Review);
