const express = require('express');
const resourceController = require('../controllers/resource.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router.delete(
  '/delete-permanently/:id',
  authController.restrictTo('admin'),
  resourceController.deleteResource
);

router
  .route('/')
  .get(resourceController.getAllResources)
  .post(
    authController.restrictTo('admin', 'instructor'),
    resourceController.uploadResource,
    resourceController.createResource
  );

router
  .route('/:id')
  .get(resourceController.getResurce)
  .patch(
    authController.restrictTo('admin', 'instructor'),
    resourceController.uploadResource,
    resourceController.updateResource
  )
  .delete(
    authController.restrictTo('admin', 'instructor'),
    resourceController.trashResource
  );

module.exports = router;
