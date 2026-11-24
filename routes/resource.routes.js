const express = require('express');
const resourceController = require('../controllers/resource.controller');
const authController = require('../controllers/auth.controller');

const router = express.Router({ mergeParams: true });

router.get('/:id/file', resourceController.openNote);

router.delete(
  '/delete-permanently/:id',
  authController.restrictTo('admin', 'instructor'),
  resourceController.authorizeResourceWrite,
  resourceController.deleteResource
);

router
  .route('/')
  .get(resourceController.getAllResources)
  .post(
    authController.restrictTo('admin', 'instructor'),
    resourceController.authorizeResourceWrite,
    resourceController.uploadResource,
    resourceController.createResource
  );

router
  .route('/:id')
  .get(resourceController.getResource)
  .patch(
    authController.restrictTo('admin', 'instructor'),
    resourceController.authorizeResourceWrite,
    resourceController.uploadResource,
    resourceController.updateResource
  )
  .delete(
    authController.restrictTo('admin', 'instructor'),
    resourceController.authorizeResourceWrite,
    resourceController.trashResource
  );

module.exports = router;
