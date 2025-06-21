const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Course must have a title'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'Course must have a description'],
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    // embed teachers for a specific cource
    teachers: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],

    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner',
    },
    tags: [String],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// virtual populate for one assignment
courseSchema.virtual('assignments', {
  ref: 'Assignment',
  foreignField: 'course',
  localField: '_id',
});

courseSchema.virtual('notes', {
  ref: 'Note',
  foreignField: 'course',
  localField: '_id',
});

courseSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'course',
  localField: '_id',
});

// this one populates the teachers field
courseSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'teachers',
    select: '-__v',
  });
  next();
});

const Course = mongoose.model('Course', courseSchema);
module.exports = Course;
