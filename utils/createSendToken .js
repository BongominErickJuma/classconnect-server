const jwt = require('jsonwebtoken');

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

module.exports = createSendToken;
