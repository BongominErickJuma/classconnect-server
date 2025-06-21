const bodyParser = require('body-parser');
const express = require('express');
const morgan = require('morgan');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');

const app = express();

// middlewares

app.use(express.json());
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/v1/classLink/users', userRoutes);
app.use('/api/v1/classLink/courses', courseRoutes);

app.all('/{*any}', (req, res, next) => {
  next(new AppError(`cannot find ${req.originalUrl} from our server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
