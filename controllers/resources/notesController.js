const Note = require('./../../models/notesModel');
const handlerFactory = require('./../handlerFactory');

exports.setCourseId = (req, res, next) => {
  if (!req.body.course) req.body.course = req.params.courseId;
  next();
};
exports.createNote = handlerFactory.createOne(Note);
exports.getAllNotes = handlerFactory.getAll(Note);
exports.getNote = handlerFactory.getOne(Note);
exports.updateNote = handlerFactory.updateOne(Note);
exports.deleteNote = handlerFactory.deleteOne(Note);
