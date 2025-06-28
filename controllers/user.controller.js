const db = require('./../config/db');
const catchAsync = require('./../utils/catchAsync');

const filterObj = (obj, ...allowedFields) => {
  const newObject = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObject[el] = obj[el];
    }
  });
  return newObject;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  // Define the fields you want to fetch
  const userFields = ['user_id', 'name', 'email', 'role', 'profile_photo'];

  // Construct the SQL query dynamically (prevents SQL injection)
  const query = {
    text: `SELECT ${userFields.join(', ')} FROM users WHERE is_deleted = FALSE`,
  };

  // Execute the query
  const users = await db.query(query);

  res.status(200).json({
    status: 'success',
    result: users.rows.length,
    data: users.rows, // Send only the rows (not the full query result)
  });
});

// GET MY DETAILS

// Controller
exports.getMe = catchAsync(async (req, res, next) => {
  const query = {
    text: `SELECT user_id, name, email, role, profile_photo, created_at
           FROM users 
           WHERE user_id = $1 AND is_deleted = FALSE`,
    values: [req.user.user_id],
  };

  const result = await db.query(query);
  const user = result.rows[0];

  if (!user) {
    return next(new AppError('Your account no longer exists', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  // Define the fields you want to fetch
  const userFields = ['user_id', 'name', 'email', 'role', 'profile_photo'];

  const query = {
    text: `SELECT ${userFields.join(
      ', '
    )} FROM users WHERE user_id = $1 AND is_deleted = FALSE`,
    values: [req.params.id],
  };

  // Execute the query
  const user = await db.query(query);

  res.status(200).json({
    status: 'success',
    data: user.rows[0],
  });
});

exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;
  const { id } = req.params;

  // Validate role input
  if (!['instructor', 'student', 'admin'].includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  const query = {
    text: `UPDATE users
           SET role = $1
           WHERE user_id = $2
           RETURNING user_id, name, email, role, profile_photo`,
    values: [role, id],
  };

  const result = await db.query(query);
  const updatedUser = result.rows[0];

  if (!updatedUser) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const query = {
    text: `DELETE FROM users            
           WHERE user_id = $1
           RETURNING user_id, name, email, role`,
    values: [id],
  };

  const result = await db.query(query);
  const deletedUser = result.rows[0];

  if (!deletedUser) {
    return next(new AppError('User not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  // Soft delete (mark as deleted rather than actual deletion)
  const query = {
    text: `UPDATE users
           SET is_deleted = TRUE           
           WHERE user_id = $1
           RETURNING user_id, name, email, role`,
    values: [req.user.user_id],
  };

  const result = await db.query(query);
  const deletedUser = result.rows[0];

  if (!deletedUser) {
    return next(new AppError('User not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1. Prevent password updates through this route
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'Please use /update-password route for password updates',
        400
      )
    );
  }

  // 2. Filter only allowed fields to update
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3. Handle profile photo upload if exists
  if (req.file) {
    filteredBody.profile_photo = `/img/users/${req.file.filename}`;
  }

  // 4. Update user document
  const query = {
    text: `UPDATE users
           SET 
             name = COALESCE($1, name),
             email = COALESCE($2, email),
             profile_photo = COALESCE($3, profile_photo)
           WHERE user_id = $4
           RETURNING user_id, name, email, role, profile_photo`,
    values: [
      filteredBody.name,
      filteredBody.email,
      filteredBody.profile_photo,
      req.user.user_id,
    ],
  };

  const result = await db.query(query);
  const updatedUser = result.rows[0];

  // 5. Send response
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});
