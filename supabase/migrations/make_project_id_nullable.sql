-- Make project_id nullable in schema_versions to support workspace-level schemas

ALTER TABLE schema_versions 
ALTER COLUMN project_id DROP NOT NULL;
