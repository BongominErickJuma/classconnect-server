const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const PostgresAPIFeatures = require('../utils/postgresAPIFeatures');

exports.getAll = (model, options = {}) =>
  catchAsync(async (req, res, next) => {
    const features = new PostgresAPIFeatures(req.query);

    if (options.fields && !req.query.fields) {
      // Use default fields if none passed by query
      features.fields = options.fields.join(', ');
    }

    const built = features.filter().sort().paginate().build(model);

    const results = await db.query(built.sql, built.params);

    res.status(200).json({
      status: 'success',
      result: results.rowCount,
      data: results.rows,
    });
  });

exports.getOne = (model, options = {}) =>
  catchAsync(async (req, res, next) => {
    const query = {
      text: `SELECT * FROM ${model}s WHERE ${model}_id = $1`,
      values: [req.params.id],
    };
    const results = await db.query(query);
    const output = results.rows[0];

    if (!output) {
      return next(new AppError('Item not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: output,
    });
  });

exports.trashOne = (model) =>
  catchAsync(async (req, res, next) => {
    const query = {
      text: `UPDATE ${model}s  SET is_deleted = TRUE WHERE ${model}_id = $1 AND is_deleted = FALSE RETURNING *`,
      values: [req.params.id],
    };

    const results = await db.query(query);

    const output = results.rows[0];

    if (!output) {
      return next(new AppError('Item not found', 404));
    }

    res.status(200).json({
      status: 'success',
      message: 'Item trashed',
    });
  });

exports.deleteOne = (model) =>
  catchAsync(async (req, res, next) => {
    const query = {
      text: `DELETE FROM ${model}s WHERE ${model}_id = $1 RETURNING *`,
      values: [req.params.id],
    };

    console.log(query);

    const results = await db.query(query);
    const output = results.rows[0];

    if (!output) {
      return next(new AppError('Item not found', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
