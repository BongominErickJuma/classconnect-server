const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A user must have a name'],
      trim: true,
    },

    email: {
      type: String,
      required: [true, 'a user email is required'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'please enter a correct email'],
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    image: {
      type: String,
      default: '/assets/images/default-user.png',
    },

    role: {
      type: String,
      enum: ['student', 'teacher', 'admin'],
      default: 'student',
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// populate the users Answers
userSchema.virtual('Answers', {
  ref: 'Answer',
  foreignField: 'student',
  localField: '_id',
});

// mongoose middeleware to hash password

userSchema.pre('save', async function (next) {
  // only run if password is actually changes
  if (!this.isModified('password')) return next();

  // hash password
  this.password = await bcrypt.hash(this.password, 12);

  // make sure the password confirm field is not stored to the database
  this.passwordConfirm = undefined;

  next();
});

userSchema.pre('save', function (next) {
  // only run is password is changed or new user is created
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// instance method which will be available on all user document
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPassword = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// ✅ Role checking utility
// userSchema.methods.hasRole = function (role) {
//   return this.role.includes(role);
// };

const User = mongoose.model('User', userSchema);
module.exports = User;
