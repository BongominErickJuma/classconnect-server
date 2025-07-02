const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/error.controller');
const AppError = require('./utils/appError');
const userRouter = require('./routes/user.routes');
const courseRouter = require('./routes/course.routes');
const notificationRouter = require('./routes/notification.routes');

const app = express();

app.use(cors());
app.options('{*any}', cors());

app.set('query parser', 'extended');

app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/ecl/users', userRouter);
app.use('/api/v1/ecl/courses', courseRouter);
app.use('/api/v1/ecl/notifications', notificationRouter);

app.all('/{*any}', (req, res, next) => {
  next(
    new AppError(`cannot find route ${req.originalUrl} from our server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
