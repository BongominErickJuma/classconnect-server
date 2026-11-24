const { readFile } = require('node:fs/promises');
const path = require('node:path');

async function migrateCourseChapters(db) {
  const files = ['001-course-chapters.sql', '002-course-video-progress.sql',
    '003-assignment-workflow.sql', '004-assignment-notifications.sql', '005-submission-cloudinary.sql',
    '006-course-reviews.sql', '007-user-presence.sql'];
  for (const filename of files) {
    const file = path.join(__dirname, 'migrations', filename);
    await db.query(await readFile(file, 'utf8'));
  }
}

if (require.main === module) {
  require('dotenv').config({ path: './config.env' });
  const db = require('../config/db');
  migrateCourseChapters(db)
    .then(() => console.log('Course, assignment, review, and user presence schema is ready.'))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => db.end());
}

module.exports = migrateCourseChapters;
