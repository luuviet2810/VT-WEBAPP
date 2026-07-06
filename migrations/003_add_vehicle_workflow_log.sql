-- Migration: Add vehicle_workflow_logs table
-- Records when a vehicle's workflow status changes through the pipeline.

CREATE TABLE IF NOT EXISTS vehicle_workflow_logs (
  id         TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (now() AT TIME ZONE 'utc'),
  created_by TEXT
);

ALTER TABLE vehicle_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read workflow logs
CREATE POLICY "Allow read vehicle_workflow_logs" ON vehicle_workflow_logs
  FOR SELECT USING (true);

-- Allow all authenticated users to insert workflow logs
CREATE POLICY "Allow insert vehicle_workflow_logs" ON vehicle_workflow_logs
  FOR INSERT WITH CHECK (true);
