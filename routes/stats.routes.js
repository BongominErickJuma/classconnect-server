const express = require('express');
const authController = require('../controllers/auth.controller');
const statsController = require('../controllers/stats.controller');
const dashboard = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(authController.protect);

router.get('/dashboard/header', dashboard.getHeaderCounts);

const dashboardRoles = authController.restrictTo('instructor', 'admin');
const studentOnly = authController.restrictTo('student');
router.get('/dashboard/filters', authController.restrictTo('student', 'instructor', 'admin'), dashboard.getFilters);
router.get('/dashboard/grading', dashboardRoles, dashboard.getGrading);
router.get('/dashboard/activity', dashboardRoles, dashboard.getActivity);
router.get('/dashboard/enrollment-members', dashboardRoles, dashboard.getEnrollmentMembers);

// recent grades & recent reviews
router.get('/student-recent-grades', studentOnly, dashboard.getStudentGrades);
router.get(
  '/instructor-recent-reviews',
  dashboardRoles,
  dashboard.getReviews
);

// Recent activities
router.get(
  '/student-recent-activities',
  studentOnly,
  dashboard.getStudentActivity
);
router.get(
  '/instructor-recent-activities',
  statsController.getInstructorRecentActivities
);

// upcoming deadlines

router.get(
  '/student-upcoming-deadlines',
  studentOnly,
  dashboard.getStudentDeadlines
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
