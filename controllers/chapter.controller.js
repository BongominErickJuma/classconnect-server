const validator = require('validator');
const db = require('../config/db');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

async function getCourseAccess(req) {
  const { course_id } = req.params;
  if (!req.user) throw new AppError('Please sign in again.', 401);
  if (!validator.isUUID(course_id)) throw new AppError('Course not found.', 404);

  const { rows: [course] } = await db.query(
    `SELECT instructor_id, EXISTS (
       SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2
     ) AS is_enrolled
     FROM courses WHERE course_id = $1 AND is_deleted IS NOT TRUE`,
    [course_id, req.user.user_id],
  );
  if (!course) throw new AppError('Course not found.', 404);

  const canManage = req.user.role === 'admin' || course.instructor_id === req.user.user_id;
  const canTrack = req.user.role === 'student' && course.is_enrolled;
  return { canManage, canWatch: canManage || course.is_enrolled, canTrack };
}

async function requireCourseManager(req) {
  const { canManage } = await getCourseAccess(req);
  if (!canManage) throw new AppError('Only course managers can make this change.', 403);
}

function readTitle(value) {
  const title = typeof value === 'string' ? value.trim() : '';
  if (!title || title.length > 100) {
    throw new AppError('Enter a title with 1 to 100 characters.', 400);
  }
  return title;
}

function parseCloudinaryVideo(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('Enter a Cloudinary video delivery URL.', 400);
  }
  if (url.origin !== 'https://res.cloudinary.com' || url.username || url.password ||
      !/^\/[^/]+\/video\/upload\/.+/.test(url.pathname)) {
    throw new AppError('Enter an HTTPS Cloudinary video upload delivery URL.', 400);
  }
  return url.href;
}

exports.getVideos = catchAsync(async (req, res) => {
  const access = await getCourseAccess(req);
  const { course_id } = req.params;
  const [chapters, videos] = await Promise.all([
    db.query(
      `SELECT chapter_id, title FROM course_chapters
       WHERE course_id = $1 ORDER BY position`,
      [course_id],
    ),
    db.query(
      `SELECT video.resource_id, video.chapter_id, video.title, video.created_at,
              video.is_deleted IS TRUE AS removed,
              CASE WHEN $2 AND video.is_deleted IS NOT TRUE
                THEN COALESCE(NULLIF(video.file_url, ''), video.link) END AS playback_url,
              CASE WHEN $4 AND video.is_deleted IS NOT TRUE THEN json_build_object(
                'positionSeconds', COALESCE(progress.position_seconds, 0),
                'completed', progress.completed_at IS NOT NULL,
                'updatedAt', progress.updated_at
              ) END AS progress
       FROM resources AS video
       LEFT JOIN course_video_progress AS progress
         ON $4 AND progress.resource_id = video.resource_id AND progress.student_id = $5
       WHERE video.course_id = $1 AND video.type = 'video'
         AND ($3 OR video.is_deleted IS NOT TRUE)
       ORDER BY video.created_at, video.resource_id`,
      [course_id, access.canWatch, access.canManage, access.canTrack, req.user.user_id],
    ),
  ]);
  res.json({ status: 'success', data: {
    ...access,
    chapters: chapters.rows,
    videos: videos.rows.filter((video) => !video.removed),
    removedVideos: videos.rows.filter((video) => video.removed),
  } });
});

exports.saveVideoProgress = catchAsync(async (req, res) => {
  const { canTrack } = await getCourseAccess(req);
  if (!canTrack) throw new AppError('Only enrolled students can record video progress.', 403);

  const { course_id, resource_id } = req.params;
  if (!validator.isUUID(resource_id)) throw new AppError('Video not found.', 404);
  const { positionSeconds, completed } = req.body ?? {};
  if (positionSeconds !== undefined && (!Number.isFinite(positionSeconds) || positionSeconds < 0)) {
    throw new AppError('Video position must be a nonnegative number.', 400);
  }
  if ((completed !== undefined && typeof completed !== 'boolean') || (positionSeconds === undefined && completed !== true)) {
    throw new AppError('Provide a video position or mark the video complete.', 400);
  }

  const { rows: [progress] } = await db.query(
    `INSERT INTO course_video_progress AS saved (student_id, resource_id, position_seconds, completed_at)
     SELECT $2, video.resource_id, COALESCE($4::double precision, 0), CASE WHEN $5 THEN NOW() END
     FROM resources AS video
     WHERE video.course_id = $1 AND video.resource_id = $3 AND video.type = 'video'
       AND video.is_deleted IS NOT TRUE
       AND EXISTS (SELECT 1 FROM enrollments WHERE course_id = $1 AND student_id = $2)
     ON CONFLICT (student_id, resource_id) DO UPDATE SET
       position_seconds = COALESCE($4, saved.position_seconds),
       completed_at = COALESCE(saved.completed_at, EXCLUDED.completed_at),
       updated_at = NOW()
     RETURNING position_seconds AS "positionSeconds", completed_at IS NOT NULL AS completed,
       updated_at AS "updatedAt"`,
    [course_id, req.user.user_id, resource_id, positionSeconds ?? null, completed === true],
  );
  if (!progress) throw new AppError('Video not found in this course.', 404);
  res.json({ status: 'success', data: progress });
});

exports.createChapter = catchAsync(async (req, res) => {
  await requireCourseManager(req);
  const { rows: [chapter] } = await db.query(
    `INSERT INTO course_chapters (course_id, title) VALUES ($1, $2)
     RETURNING chapter_id, title`,
    [req.params.course_id, readTitle(req.body?.title)],
  );
  res.status(201).json({ status: 'success', data: chapter });
});

exports.renameChapter = catchAsync(async (req, res) => {
  await requireCourseManager(req);
  const { course_id, chapter_id } = req.params;
  if (!validator.isUUID(chapter_id)) throw new AppError('Chapter not found.', 404);

  const { rows: [chapter] } = await db.query(
    `UPDATE course_chapters SET title = $3
     WHERE course_id = $1 AND chapter_id = $2
     RETURNING chapter_id, title`,
    [course_id, chapter_id, readTitle(req.body?.title)],
  );
  if (!chapter) throw new AppError('Chapter not found in this course.', 404);
  res.json({ status: 'success', data: chapter });
});

exports.deleteChapter = catchAsync(async (req, res) => {
  await requireCourseManager(req);
  const { course_id, chapter_id } = req.params;
  if (!validator.isUUID(chapter_id)) throw new AppError('Chapter not found.', 404);

  // Lock the chapter while its resources are detached and the chapter is deleted.
  const { rows: [chapter] } = await db.query(
    `WITH target AS (
       SELECT course_id, chapter_id FROM course_chapters
       WHERE course_id = $1 AND chapter_id = $2 FOR UPDATE
     ), detached AS (
       UPDATE resources AS resource SET chapter_id = NULL, updated_at = NOW()
       FROM target WHERE resource.course_id = target.course_id AND resource.chapter_id = target.chapter_id
       RETURNING resource.resource_id
     )
     DELETE FROM course_chapters AS chapter
     USING target, (SELECT COUNT(*)::int AS total FROM detached) AS moved
     WHERE chapter.course_id = target.course_id AND chapter.chapter_id = target.chapter_id
     RETURNING moved.total AS unassigned_count`,
    [course_id, chapter_id],
  );
  if (!chapter) throw new AppError('Chapter not found in this course.', 404);
  res.json({ status: 'success', data: chapter });
});

exports.addVideo = catchAsync(async (req, res) => {
  await requireCourseManager(req);
  const { course_id, chapter_id } = req.params;
  if (!validator.isUUID(chapter_id)) throw new AppError('Chapter not found.', 404);

  const { rows: [video] } = await db.query(
    `INSERT INTO resources (course_id, chapter_id, title, type, file_url)
     SELECT course_id, chapter_id, $3, 'video', $4 FROM course_chapters
     WHERE course_id = $1 AND chapter_id = $2
     RETURNING resource_id, chapter_id, title, created_at, file_url AS playback_url`,
    [course_id, chapter_id, readTitle(req.body?.title), parseCloudinaryVideo(req.body?.url)],
  );
  if (!video) throw new AppError('Chapter not found.', 404);
  res.status(201).json({ status: 'success', data: video });
});

exports.moveVideo = catchAsync(async (req, res) => {
  await requireCourseManager(req);
  const { course_id, resource_id } = req.params;
  const chapterId = req.body?.chapterId;
  if (!validator.isUUID(resource_id)) throw new AppError('Video not found.', 404);
  if (typeof chapterId !== 'string' || !validator.isUUID(chapterId)) {
    throw new AppError('Choose a chapter.', 400);
  }
  const { rows: [video] } = await db.query(
    `UPDATE resources AS video SET chapter_id = chapter.chapter_id, updated_at = NOW()
     FROM course_chapters AS chapter
     WHERE video.course_id = $1 AND video.resource_id = $2
       AND video.type = 'video' AND video.is_deleted IS NOT TRUE
       AND chapter.course_id = video.course_id AND chapter.chapter_id = $3
     RETURNING video.resource_id, video.chapter_id`,
    [course_id, resource_id, chapterId],
  );
  if (!video) throw new AppError('Video or chapter not found in this course.', 404);
  res.json({ status: 'success', data: video });
});

exports.setVideoRemoved = catchAsync(async (req, res) => {
  await requireCourseManager(req);
  const { course_id, resource_id } = req.params;
  const removed = req.body?.removed;
  if (!validator.isUUID(resource_id)) throw new AppError('Video not found.', 404);
  if (typeof removed !== 'boolean') throw new AppError('Specify whether to remove or restore the video.', 400);

  const { rows: [video] } = await db.query(
    `UPDATE resources SET is_deleted = $3,
       updated_at = CASE WHEN is_deleted IS DISTINCT FROM $3 THEN NOW() ELSE updated_at END
     WHERE course_id = $1 AND resource_id = $2 AND type = 'video'
     RETURNING resource_id, chapter_id, title, created_at, is_deleted AS removed,
       CASE WHEN NOT $3 THEN COALESCE(NULLIF(file_url, ''), link) END AS playback_url`,
    [course_id, resource_id, removed],
  );
  if (!video) throw new AppError('Video not found in this course.', 404);
  res.json({ status: 'success', data: video });
});

exports.deleteRemovedVideo = catchAsync(async (req, res) => {
  await requireCourseManager(req);
  const { course_id, resource_id } = req.params;
  if (!validator.isUUID(resource_id)) throw new AppError('Removed video not found.', 404);

  const { rowCount } = await db.query(
    `DELETE FROM resources
     WHERE course_id = $1 AND resource_id = $2 AND type = 'video' AND is_deleted IS TRUE`,
    [course_id, resource_id],
  );
  if (rowCount === 0) throw new AppError('Removed video not found in this course.', 404);
  res.status(204).end();
});
