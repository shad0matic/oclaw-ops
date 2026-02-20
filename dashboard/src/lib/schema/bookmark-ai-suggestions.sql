-- Add columns to store AI-suggested categories, confidence, and reasoning
ALTER TABLE ops.x_bookmarks ADD COLUMN 
  ai_suggested_category_id INTEGER,
  ai_confidence REAL,
  ai_reasoning TEXT;
