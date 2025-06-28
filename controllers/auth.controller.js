const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');
const crypto = require('crypto');

const db = require('../config/db');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const sendEmail = require('../utils/email');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (res, user, statusCode) => {
  const token = signToken(user.user_id);

  const cookieOptions = {
    expiresIn:
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }
  //   send cookies

  res.cookie('ecl_Jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token,
    data: user,
  });
};

const changedPassword = (passwordChangedAt, JWTTimestamp) => {
  if (passwordChangedAt) {
    const changedTimestamp = parseInt(passwordChangedAt.getTime() / 1000, 10);
    console.log(JWTTimestamp, changedTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

const generatePasswordResetToken = async (user) => {
  // 1. Create random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Set expiration (10 minutes from now)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // 4. Save to database
  const query = {
    text: `UPDATE users 
           SET reset_password_token = $1, 
               reset_token_expires = $2 
           WHERE user_id = $3 RETURNING*`,
    values: [hashedToken, expiresAt, user.user_id],
  };

  const result = await db.query(query);

  return resetToken;
};

// SIGN UP USERS

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 12);

  const query = {
    text: `INSERT INTO USERS (name, email, password) VALUES ($1, $2, $3) RETURNING user_id, name, email, role, profile_photo`,
    values: [name, email, hashedPassword],
  };

  const result = await db.query(query);
  const newUser = result.rows[0];

  createSendToken(res, newUser, 201);
});

// LOGIN USERS

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }

  // 2. Get user from database (including password)
  const query = {
    text: `SELECT user_id, name, email, role, profile_photo, password, email_verified FROM users WHERE email = $1 AND is_deleted = FALSE`,
    values: [email],
  };

  const result = await db.query(query);
  const user = result.rows[0];

  // 3. Check if user exists and password is correct
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  user.password = undefined;
  // 4. If everything is OK, send token
  createSendToken(res, user, 200);
});

// PROTECT ROUTES

exports.protect = catchAsync(async (req, res, next) => {
  // 01 geting token and check if its there in the headers
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
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
    // Don't reveal if user doesn't exist (security best practice)
    return res.status(200).json({
      status: 'success',
      message: 'If the email exists, a reset token has been sent',
    });
  }

  // 2. Generate reset token
  const resetToken = await generatePasswordResetToken(user);

  // 3. Send email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/auth/reset-password/${resetToken}`;

    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 minutes)',
      message: `Forgot your password? Submit a PATCH request with your new password to: ${resetURL}\nIf you didn't forget your password, please ignore this email.`,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    // Clear the reset token if email fails
    await db.query(
      `UPDATE users SET reset_password_token = NULL, reset_token_expires = NULL WHERE user_id = $1`,
      [user.user_id]
    );

    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500
      )
    );
  }
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
