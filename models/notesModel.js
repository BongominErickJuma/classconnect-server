const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'A note must have a title'],
    unique: true,
  },
  body: String,
  course: {
    type: mongoose.Schema.ObjectId,
    ref: 'Course',
    required: [true, 'A note must have a course ID'],
  },
});

noteSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'course',
    select: 'name',
  });
  next();
});

const Note = mongoose.model('Note', noteSchema);

module.exports = Note;
