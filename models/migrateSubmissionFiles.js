const migrateCourseChapters = require('./migrateCourseChapters');

async function migrateSubmissionFiles(db) {
  const { readCloudinarySubmission, retrySubmissionCleanup, withCloudinarySubmission } =
    require('../utils/submissionCloudStorage');
  let previousId = null;
  let migrated = 0;
  let failed = 0;

  while (true) {
    const { rows: [file] } = await db.query(`
      SELECT submission_id, filename, contents FROM submission_files
      WHERE contents IS NOT NULL AND ($1::uuid IS NULL OR submission_id > $1)
      ORDER BY submission_id LIMIT 1`, [previousId]);
    if (!file) break;
    previousId = file.submission_id;

    try {
      await withCloudinarySubmission(db, file.filename, file.contents, async (publicId) => {
        const copy = await readCloudinarySubmission(publicId);
        if (!copy.equals(file.contents)) throw new Error('The Cloudinary copy did not match the database file.');
        const { rowCount } = await db.query(`
          UPDATE submission_files SET cloudinary_public_id = $2, contents = NULL
          WHERE submission_id = $1 AND contents = $3 AND filename = $4`,
        [file.submission_id, publicId, file.contents, file.filename]);
        if (!rowCount) throw new Error('The stored submission changed during migration.');
      });
      migrated += 1;
    } catch {
      failed += 1;
    }
  }

  const { rows: [{ remaining }] } = await db.query(
    'SELECT COUNT(*)::int AS remaining FROM submission_files WHERE contents IS NOT NULL',
  );
  await retrySubmissionCleanup(db);
  return { migrated, failed, remaining };
}

if (require.main === module) {
  require('dotenv').config({ path: './config.env' });
  const db = require('../config/db');
  migrateCourseChapters(db)
    .then(() => migrateSubmissionFiles(db))
    .then(({ migrated, failed, remaining }) => {
      console.log(`Submission files migrated: ${migrated}. Failed attempts: ${failed}. Still in PostgreSQL: ${remaining}.`);
      if (remaining) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`Could not migrate submission files (${error.code || error.name}).`);
      process.exitCode = 1;
    })
    .finally(() => db.end());
}

module.exports = migrateSubmissionFiles;
