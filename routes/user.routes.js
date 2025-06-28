const express = require('express');
const userController = require('./../controllers/user.controller');
const authController = require('./../controllers/auth.controller');

const router = express.Router();

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

//

router.use(authController.protect);

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
