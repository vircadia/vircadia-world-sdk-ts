-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create world table
CREATE TABLE worlds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  metadata JSONB,
  scene_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create a trigger function to update the updated_at column
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the worlds table
CREATE TRIGGER update_worlds_modtime BEFORE UPDATE
  ON worlds FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Enable Realtime for the worlds table
ALTER PUBLICATION supabase_realtime ADD TABLE worlds;

-- Add index for better query performance
CREATE INDEX idx_worlds_name ON worlds(name);
