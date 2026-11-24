const express = require('express');
const submission = require('../controllers/submission.controller');
const router = express.Router({ mergeParams: true });

router.delete('/delete-permanently/:id', submission.deleteSubmission);
router.get('/:id/file', submission.downloadSubmission);
router.patch('/:id/restore', submission.restoreSubmission);
router.route('/')
  .get(submission.getAllSubmissions)
  .post(submission.requireSubmissionAccess, submission.uploadSubmission, submission.createSubmission)
  .put(submission.requireSubmissionAccess, submission.uploadSubmission, submission.replaceSubmission);
router.route('/:id').get(submission.getSubmission).delete(submission.trashSubmission);

module.exports = router;
