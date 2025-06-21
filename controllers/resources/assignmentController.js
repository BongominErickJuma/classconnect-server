const Assignment = require('./../../models/assignmentModel');
const handlerFactory = require('./../handlerFactory');

exports.setCourseId = (req, res, next) => {
  if (!req.body.course) req.body.course = req.params.courseId;
  next();
};

exports.createAssignment = handlerFactory.createOne(Assignment);
exports.getAllAssignments = handlerFactory.getAll(Assignment);
exports.getAssignment = handlerFactory.getOne(Assignment, {
  path: 'answers',
  select: '-__v -body',
});
exports.updateAssignment = handlerFactory.updateOne(Assignment);
exports.deleteAssignment = handlerFactory.deleteOne(Assignment);
