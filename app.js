const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const globalErrorHandler = require('./controllers/error.controller');
const AppError = require('./utils/appError');
const userRouter = require('./routes/user.routes');
const courseRouter = require('./routes/course.routes');
const notificationRouter = require('./routes/notification.routes');
const statiisticsRouter = require('./routes/stats.routes');
const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'https://eclassconnect.netlify.app',
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like curl or postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.set('query parser', 'extended');

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/v1/ecl/users', userRouter);
app.use('/api/v1/ecl/courses', courseRouter);
app.use('/api/v1/ecl/notifications', notificationRouter);
app.use('/api/v1/ecl/stats', statiisticsRouter);

app.all('/{*any}', (req, res, next) => {
  next(
    new AppError(`cannot find route ${req.originalUrl} from our server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
