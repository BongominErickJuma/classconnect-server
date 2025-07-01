const express = require('express');
const userController = require('./../controllers/user.controller');
const authController = require('./../controllers/auth.controller');
const gradeRouter = require(gradeRouter);

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.patch('/verify-email/:token', authController.verifyEmail);

//

router.use(authController.protect);

// GRADES ROUTES

router.use('/grades', gradeRouter);
router.use('/:user_id/grades', gradeRouter);

// USER ROUTES

router.patch('/updatePassword', authController.updatePassword);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
router.get('/me', userController.getMe);

router.route('/').get(userController.getAllUsers);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(authController.restrictTo('admin'), userController.updateUserRole)
  .delete(authController.restrictTo('admin'), userController.deleteUser);

module.exports = router;
