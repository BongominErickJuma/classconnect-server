const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisify } = require('util');
const sendEmail = require('./../utils/email');

const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const { resolveSrv } = require('dns');

const signJWT = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signJWT(user._id);

  if (user.role[0] === 'student') {
    user.subjects = undefined;
  }
  user.password = undefined;
  user.role = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    user,
  });
};
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
    subjects: req.body.subjects,
  });

  const message = `Dear ${newUser.name}\nYour default password is ${req.body.password}`;
  try {
    await sendEmail({
      email: newUser.email,
      subject: 'Your Default Password',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: `Default password sent to ${newUser.email}`,
    });
  } catch (error) {
    return next(new AppError('Error Sending Email', 500));
  }
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  // 01 check if email and password exists in the req.body
  if (!email || !password)
    return next(new AppError('Please provide email and password', 400));

  // 02 check if user exists & password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect Email or Password', 401));
  }

  // 03 if everything is okay, send token to client

  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  // 01 geting token and check if its there in the headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) return next(new AppError('Please login to gain access', 401));

  // 02 verification of the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 03 check of the user still exists
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) return next(new AppError('The user no longer exists', 401));

  // 04 check if the user changed password when token was issued
  if (currentUser.changedPassword(decoded.iat))
    return next(new AppError('User recently changed Password', 401));

  // 05 grant access to the user
  req.user = currentUser;
  next();
});

// authorization, user role and permission

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 01 get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('There is no user with such email', 404));

  // 02 Generate random reset token using crypto
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // 03 send the reset token to the user email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Reset your passeord here ${resetURL}`;
  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token, valid for 10 minutes',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('Error Sending Email', 500));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 01 Get user based on token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 02 if token has expired,and there is user, set the new password
  if (!user) return next(new AppError('Token is invalid or has expired', 400));

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 03 update passwordChangedAt property of the user. using document middleware
  // 04 log the user in, send JWT

  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 01 Get user from the collection
  const user = await User.findById(req.user.id).select('+password');

  if (!user) return next(new AppError('User does not exist', 404));

  // 02 check if POSTed current password is correct
  const { password, passwordCurrent, passwordConfirm } = req.body;

  if (!(await user.correctPassword(passwordCurrent, user.password)))
    return next(new AppError('Incorrect Current Password', 401));

  // 03 Update password

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  await user.save();

  // 04 log in user, send JWT

  createSendToken(user, 200, res);
});
