const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const APIFeatures = require('./../utils/apiFeatures');

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const newDocument = await Model.create(req.body);
    res.status(201).json({
      status: 'success',
      data: newDocument,
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // Allows for nested GET reviews on Tour

    const features = new APIFeatures(Model.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const document = await features.query;
    res.status(200).json({
      status: 'success',
      result: document.length,
      data: document,
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    // if (popOptions) query = query.populate(popOptions);

    if (popOptions) {
      // Handle both array and single population option
      const options = Array.isArray(popOptions) ? popOptions : [popOptions];
      options.forEach((option) => (query = query.populate(option)));
    }

    const document = await query;

    if (!document) {
      return next(
        new AppError(`Cannot find document with ID ${req.params.id}`, 404)
      );
    }
    res.status(200).json({
      status: 'success',
      data: document,
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!document) {
      return next(
        new AppError(`Cannot find document with ID ${req.params.id}`, 404)
      );
    }
    res.status(200).json({
      status: 'sucess',
      data: document,
    });
  });

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document) {
      return next(
        new AppError(`Cannot find document with ID ${req.params.id}`, 404)
      );
    }
    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
