const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'A assignment must have a title'],
      unique: true,
    },
    body: String,
    course: {
      type: mongoose.Schema.ObjectId,
      ref: 'Course',
      required: [true, 'An assignment must have a course ID'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

assignmentSchema.virtual('answers', {
  ref: 'Answer',
  foreignField: 'assignment',
  localField: '_id',
});

const Assignment = mongoose.model('Assignment', assignmentSchema);

module.exports = Assignment;
