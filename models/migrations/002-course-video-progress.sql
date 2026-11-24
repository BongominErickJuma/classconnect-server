CREATE TABLE IF NOT EXISTS course_video_progress (
  student_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES resources(resource_id) ON DELETE CASCADE,
  position_seconds DOUBLE PRECISION NOT NULL DEFAULT 0
    CHECK (position_seconds >= 0 AND position_seconds < 'Infinity'::DOUBLE PRECISION),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (student_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_course_video_progress_resource
  ON course_video_progress(resource_id);
