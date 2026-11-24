const express = require('express');
const grade = require('../controllers/grade.controller');
const router = express.Router({ mergeParams: true });

router.delete('/delete-permanently/:id', grade.deleteGrade);
router.route('/').get(grade.getAllGrades).post(grade.createGrade).put(grade.saveGrade);
router.route('/:id').get(grade.getGrade).patch(grade.updateGrade);

module.exports = router;
