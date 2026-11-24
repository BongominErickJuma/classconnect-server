module.exports = (err, req, res, next) => {
  if (err.code === '23514' && ['protect_graded_submission', 'protect_assignment_max_score'].includes(err.constraint)) {
    return res.status(409).json({ status: 'fail', message: err.message });
  }
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
};
