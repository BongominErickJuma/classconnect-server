const { randomUUID } = require('node:crypto');
const cloudinary = require('../config/cloudinary');
const AppError = require('./appError');

const maxFileSize = 10 * 1024 * 1024;
const delivery = { resource_type: 'raw', type: 'authenticated', secure: true };
const submissionIdPattern = /^assignment-submissions\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;
let cleanup;

function uploadAsset(publicId, contents) {
  return new Promise((resolve, reject) => {
    const fail = () => reject(new AppError('Could not upload the submission to Cloudinary. Please try again.', 502));
    const stream = cloudinary.uploader.upload_stream({ ...delivery, public_id: publicId, overwrite: false, timeout: 30_000 }, (error, result) => {
      if (error || result?.public_id !== publicId || result.resource_type !== delivery.resource_type ||
          result.type !== delivery.type || result.bytes !== contents.length) return fail();
      resolve();
    });
    stream.on('error', fail).end(contents);
  });
}

async function readCloudinarySubmission(publicId) {
  if (!submissionIdPattern.test(publicId)) throw new AppError('Submission file not found.', 404);

  const expiresAt = Math.floor(Date.now() / 1000) + 60;
  const url = new URL(cloudinary.utils.private_download_url(publicId, undefined, { ...delivery, expires_at: expiresAt }));
  if (url.protocol !== 'https:' || !/^api(?:-eu|-ap)?\.cloudinary\.com$/.test(url.hostname) || url.username || url.password) {
    throw new AppError('Could not open the stored submission.', 502);
  }

  try {
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(20_000) });
    if (!response.ok || !response.body) {
      await response.body?.cancel();
      throw new AppError('Could not download the submission from Cloudinary. Please try again.', 502);
    }
    const chunks = [];
    let size = 0;
    for await (const chunk of response.body) {
      size += chunk.byteLength;
      if (size > maxFileSize) throw new AppError('The stored submission exceeds the file size limit.', 502);
      chunks.push(chunk);
    }
    if (!size) throw new AppError('The stored submission is empty.', 502);
    return Buffer.concat(chunks, size);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Could not download the submission from Cloudinary. Please try again.', 502);
  }
}

function retrySubmissionCleanup(db) {
  if (cleanup) return cleanup;
  cleanup = (async () => {
    const { rows } = await db.query(`
      SELECT public_id FROM submission_cloudinary_cleanup q
      WHERE NOT EXISTS (SELECT 1 FROM submission_files WHERE cloudinary_public_id = q.public_id)
      ORDER BY last_attempt_at NULLS FIRST, queued_at LIMIT 20`);
    for (const { public_id: publicId } of rows) {
      if (!submissionIdPattern.test(publicId)) continue;
      await db.query('UPDATE submission_cloudinary_cleanup SET last_attempt_at = NOW() WHERE public_id = $1', [publicId]);
      try {
        const { result } = await cloudinary.uploader.destroy(publicId, { ...delivery, timeout: 10_000 });
        if (result === 'ok' || result === 'not found') {
          await db.query('DELETE FROM submission_cloudinary_cleanup WHERE public_id = $1', [publicId]);
          continue;
        }
      } catch {
        // Leave the queued ID for a later attempt.
      }
      console.error('Cloudinary submission cleanup will retry.');
    }
  })().finally(() => { cleanup = null; });
  return cleanup;
}

function requestSubmissionCleanup(db) {
  retrySubmissionCleanup(db).catch(() => console.error('Could not process the submission cleanup queue.'));
}

function startSubmissionCleanup(db) {
  requestSubmissionCleanup(db);
  setInterval(() => requestSubmissionCleanup(db), 60_000).unref();
}

async function withCloudinarySubmission(db, filename, contents, save) {
  const extension = filename.match(/\.[a-z0-9]{1,10}$/i)?.[0].toLowerCase() ?? '.bin';
  const publicId = `assignment-submissions/${randomUUID()}${extension}`;
  try {
    await uploadAsset(publicId, contents);
    return await save(publicId);
  } catch (error) {
    try {
      // A failed acknowledgement can still mean the database committed the new file reference.
      await db.query(`INSERT INTO submission_cloudinary_cleanup (public_id)
        SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM submission_files WHERE cloudinary_public_id = $1)
        ON CONFLICT DO NOTHING`, [publicId]);
    } catch {
      console.error('Could not queue an unused Cloudinary submission file for cleanup.');
    }
    throw error;
  } finally {
    requestSubmissionCleanup(db);
  }
}

module.exports = { maxFileSize, withCloudinarySubmission, readCloudinarySubmission, requestSubmissionCleanup,
  retrySubmissionCleanup, startSubmissionCleanup };
