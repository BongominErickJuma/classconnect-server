const Course = require('./../models/courseModel');
const handlerFactory = require('./handlerFactory');

exports.createCourse = handlerFactory.createOne(Course);
exports.getAllCourses = handlerFactory.getAll(Course);
exports.getCourse = handlerFactory.getOne(Course, [
  { path: 'assignments', select: '-body -__v' },
  { path: 'notes', select: '-course -__v' },
  { path: 'reviews' },
]);
exports.updateCourse = handlerFactory.updateOne(Course);
exports.deleteCourse = handlerFactory.deleteOne(Course);
