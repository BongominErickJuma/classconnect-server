const express = require('express');
const userRouter = require('./routes/user.routes');
const globalErrorHandler = require('./controllers/error.controller');
const AppError = require('./utils/appError');

const app = express();

app.use(express.json());

app.use('/api/v1/ecl/users', userRouter);

app.all('/{*any}', (req, res, next) => {
  next(
    new AppError(`cannot find route ${req.originalUrl} from our server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
