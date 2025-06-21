const Answer = require('./../../models/answerModel');
const handlerFactory = require('./../handlerFactory');

exports.setAssignmentStudentIds = (req, res, next) => {
  if (!req.body.assignment) req.body.assignment = req.params.assignmentId;
  if (!req.body.student) req.body.student = req.user.id;
  next();
};

exports.createAnswer = handlerFactory.createOne(Answer);
exports.getAllAnswers = handlerFactory.getAll(Answer);
exports.getAnswer = handlerFactory.getOne(Answer, [{ path: 'student' }]);
exports.updateAnswer = handlerFactory.updateOne(Answer);
exports.deleteAnswer = handlerFactory.deleteOne(Answer);
