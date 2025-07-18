const express = require('express');
const authController = require('../controllers/auth.controller');
const statsController = require('../controllers/stats.controller');

const router = express.Router();

router.use(authController.protect);

// recent grades & recent reviews
router.get('/student-recent-grades', statsController.getStudentRecentGrades);
router.get(
  '/instructor-recent-reviews',
  statsController.getInstructorRecentReviews
);

// Recent activities
router.get(
  '/student-recent-activities',
  statsController.getStudentRecentActivities
);
router.get(
  '/instructor-recent-activities',
  statsController.getInstructorRecentActivities
);

// upcoming deadlines

router.get(
  '/student-upcoming-deadlines',
  statsController.getStudentUpcomingDeadlines
);
router.get(
  '/instructor-upcoming-deadlines',
  statsController.getInstructorUpcomingDeadlines
);

// dashboard metrics

router.get(
  '/student-dashboard-metrics',
  statsController.getStudentDashboardMetrics
);
router.get(
  '/instructor-dashboard-metrics',
  statsController.getInstructorDashboardMetrics
);

module.exports = router;
