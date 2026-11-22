-- Migration: Add vehicle_workflow_logs table (Neon compatible)
-- Records when a vehicle's workflow status changes through the pipeline.

CREATE TABLE IF NOT EXISTS vehicle_workflow_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

ALTER TABLE vehicle_workflow_logs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read workflow logs
CREATE POLICY "Allow read vehicle_workflow_logs" ON vehicle_workflow_logs
  FOR SELECT USING (true);

-- Allow all authenticated users to insert workflow logs
CREATE POLICY "Allow insert vehicle_workflow_logs" ON vehicle_workflow_logs
  FOR INSERT WITH CHECK (true);
