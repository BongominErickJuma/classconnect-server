const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'An answer must have a title'],
    },
    body: String,
    assignment: {
      type: mongoose.Schema.ObjectId,
      ref: 'Assignment',
      required: [true, 'An answer must have assignment ID'],
    },

    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'An answer must have Student ID'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Answer = mongoose.model('Answer', answerSchema);

module.exports = Answer;
