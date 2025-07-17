const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { promisify } = require('util');

const db = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const createSendToken = require('../utils/createSendToken ');
const changedPassword = require('../utils/changedPassword ');
const generateEmailVerificationToken = require('../utils/generateEmailVerificationToken');
const generatePasswordResetToken = require('../utils/generatePasswordResetToken');
const sendUserEmail = require('../utils/sendUserEmail');

// SIGN UP USERS

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  const query = {
    text: `INSERT INTO users 
           (name, email, password) 
           VALUES ($1, $2, $3) 
           RETURNING user_id, name, email, role, profile_photo`,
    values: [name, email, hashedPassword],
  };

  const result = await db.query(query);
  const newUser = result.rows[0];

  // Generate and send verification token
  const verificationToken = await generateEmailVerificationToken(newUser);

  let verifyURL = '';
  if (process.env.NODE_ENV === 'production') {
    verifyURL = `https://eclassconnect.netlify.app/verify-email?token=${verificationToken}`;
  } else {
    verifyURL = `http://localhost:5173/verify-email?token=${verificationToken}`;
  }

  await sendUserEmail({
    user: newUser,
    url: verifyURL,
    tokenField: 'verification_token',
    expiresField: 'verification_token_expires',
    emailType: 'emailVerification',
  });
  res.status(200).json({
    status: 'success',
    message:
      'Verification email sent! Please check your inbox. If you don’t see it, check your spam or junk folder.',
  });
});

// LOGIN USERS

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Get user from database (including password and verification status)
  const query = {
    text: `SELECT user_id, name, email, role, profile_photo, password, email_verified 
           FROM users 
           WHERE email = $1 AND is_deleted = FALSE`,
    values: [email],
  };

  const result = await db.query(query);
  const user = result.rows[0];

  // 3. Check if user exists and password is correct
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 4. Check if email is verified
  if (!user.email_verified) {
    return next(
      new AppError(
        'Please verify your email first. Check your inbox for the verification link.',
        401
      )
    );
  }

  // Remove password from the user object
  user.password = undefined;

  // 5. If everything is OK, send token
  createSendToken(res, user, 200);
});

// LOGOUT USER

exports.logout = (req, res) => {
  res.cookie('ecl_Jwt', 'loggedOut', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  });

  res.status(200).json({
    status: 'succes',
    message: 'Logout successfull',
  });
};

// PROTECT ROUTES

exports.protect = catchAsync(async (req, res, next) => {
  // 01 geting token and check if its there in the headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.ecl_Jwt) {
    token = req.cookies.ecl_Jwt;
  }

  if (!token) return next(new AppError('You are not logged in', 401));

  //   02 verify the token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 03 check of the user still exists

  const query = {
    text: `SELECT * FROM users WHERE user_id = $1 AND is_deleted = FALSE`,
    values: [decoded.id],
  };

  const currentUser = await db.query(query);
  if (!currentUser) {
    return next(new AppError('The user no longer exists', 401));
  }

  //   04 check if user recently changed password

  if (changedPassword(currentUser.password_changed_at, decoded.iat)) {
    return next(new AppError('User recently changed Password', 401));
  }

  //   05 all are okay, GRANT ACCESS
  req.user = currentUser.rows[0];

  next();
});

// RESTRICT ACTIONS

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

// FORGOT PASSWORD

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1. Get user from database
  const query = {
    text: `SELECT * FROM users WHERE email = $1 AND is_deleted = FALSE`,
    values: [req.body.email],
  };

  const result = await db.query(query);
  const user = result.rows[0];

  if (!user) {
    return res.status(200).json({
      status: 'success',
      message: 'If the email exists, a reset token has been sent',
    });
  }

  // 2. Generate reset token
  const resetToken = await generatePasswordResetToken(user);

  // 3. Send email
  let resetURL = '';
  if (process.env.NODE_ENV === 'production') {
    resetURL = `https://eclassconnect.netlify.app/reset-password?token=${resetToken}`;
  } else {
    resetURL = `http://localhost:5173/reset-password?token=${resetToken}`;
  }

  await sendUserEmail({
    user,
    url: resetURL,
    tokenField: 'reset_password_token',
    expiresField: 'reset_token_expires',
    emailType: 'passwordReset',
  });

  res.status(200).json({
    status: 'success',
    message:
      'Token sent! Please check your inbox. If you don’t see it, check your spam or junk folder.',
  });
});
// RESET PASSWORD

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1. Hash the token from URL
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // 2. Find user with valid token and expiration
  const userQuery = {
    text: `SELECT * FROM users 
           WHERE reset_password_token = $1 
           AND reset_token_expires > NOW()`,
    values: [hashedToken],
  };

  const result = await db.query(userQuery);
  const user = result.rows[0];

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 3. Update password and clear reset token
  const hashedPassword = await bcrypt.hash(req.body.password, 12);

  const updateQuery = {
    text: `UPDATE users 
           SET password = $1,
               password_changed_at = NOW(),
               reset_password_token = NULL,
               reset_token_expires = NULL
           WHERE user_id = $2
           RETURNING user_id, name, email, role, profile_photo`,
    values: [hashedPassword, user.user_id],
  };

  const updatedUser = await db.query(updateQuery);

  // 4. Log user in (send JWT)
  createSendToken(res, updatedUser.rows[0], 200);
});

// CHANGE PASSWORD

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1. Get user from database
  const userQuery = {
    text: `SELECT password FROM users WHERE user_id = $1 AND is_deleted = FALSE`,
    values: [req.user.user_id],
  };

  const result = await db.query(userQuery);
  const user = result.rows[0];

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // 2. Verify current password
  const { newPassword, currentPassword } = req.body;

  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return next(new AppError('Your current password is incorrect', 401));
  }

  // 3. Hash and update new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  const updateQuery = {
    text: `UPDATE users 
           SET password = $1, 
               password_changed_at = NOW() 
           WHERE user_id = $2
           RETURNING user_id, name, email, role, profile_photo`,
    values: [hashedPassword, req.user.user_id],
  };

  const updatedUser = await db.query(updateQuery);

  // 4. Send new token
  createSendToken(res, updatedUser.rows[0], 200);
});

// Verify Email

exports.verifyEmail = catchAsync(async (req, res, next) => {
  // 1. Get and hash token
  const verificationToken = req.params.token;
  const hashedToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  // 2. Find unverified user with valid token
  const query = {
    text: `SELECT * FROM users 
           WHERE verification_token = $1 
           AND email_verified = FALSE 
           AND verification_token_expires > NOW()
           AND is_deleted = FALSE`,
    values: [hashedToken],
  };

  const result = await db.query(query);
  const user = result.rows[0];

  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  // 3. Mark as verified and clear token
  const updateQuery = {
    text: `UPDATE users 
           SET email_verified = TRUE, 
               verification_token = NULL,
               verification_token_expires = NULL
           WHERE user_id = $1 
           RETURNING user_id, name, email, role, profile_photo`,
    values: [user.user_id],
  };

  const updateResult = await db.query(updateQuery);
  const verifiedUser = updateResult.rows[0];

  // 3. Send email
  let updatePhotoURL = '';

  if (process.env.NODE_ENV === 'production') {
    updatePhotoURL = `https://eclassconnect.netlify.app/login`;
  } else {
    updatePhotoURL = `http://localhost:5173/login`;
  }

  await sendUserEmail({
    user: verifiedUser,
    url: updatePhotoURL,
    tokenField: 'verification_token',
    expiresField: 'verification_token_expires',
    emailType: 'welcomeUser',
  });

  // 4. NOW issue the JWT token
  createSendToken(res, verifiedUser, 200);
});
