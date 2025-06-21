const express = require('express');
const notesController = require('./../controllers/resources/notesController');
const authController = require('./../controllers/authController');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .post(
    authController.restrictTo('admin', 'teacher'),
    notesController.setCourseId,
    notesController.createNote
  )
  .get(notesController.getAllNotes);

router
  .route('/:id')
  .get(notesController.getNote)
  .patch(
    authController.restrictTo('admin', 'teacher'),
    notesController.updateNote
  )
  .delete(
    authController.restrictTo('admin', 'teacher'),
    notesController.deleteNote
  );

module.exports = router;
