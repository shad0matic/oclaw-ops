-- Create the bookmark categories table
CREATE TABLE IF NOT EXISTS ops.x_bookmark_categories (
  id SERIAL PRIMARY KEY,
  parent_id INT REFERENCES ops.x_bookmark_categories(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed initial hierarchical categories
INSERT INTO ops.x_bookmark_categories (parent_id, slug, name, description, emoji, sort_order) VALUES
  (NULL, 'uncategorized', 'Uncategorized', 'Bookmarks that have not been categorized', '❓', 0),
  (NULL, 'tech', 'Technology', 'Tech-related bookmarks', '💻', 1),
    ((SELECT id FROM ops.x_bookmark_categories WHERE slug = 'tech'), 'ai', 'AI & Machine Learning', 'Artificial Intelligence and ML topics', '🤖', 1),
    ((SELECT id FROM ops.x_bookmark_categories WHERE slug = 'tech'), 'dev', 'Development', 'Programming and development resources', '👨‍💻', 2),
    ((SELECT id FROM ops.x_bookmark_categories WHERE slug = 'tech'), 'tools', 'Tools', 'Useful tech tools and utilities', '🛠️', 3),
  (NULL, 'news', 'News', 'News articles and updates', '📰', 2),
  (NULL, 'research', 'Research', 'Research materials and papers', '🔬', 3),
  (NULL, 'inspiration', 'Inspiration', 'Motivational and inspirational content', '💡', 4),
  (NULL, 'personal', 'Personal', 'Personal interest bookmarks', '👤', 5);

-- Update existing bookmarks to set category as 'uncategorized' if NULL
UPDATE ops.x_bookmarks SET category = 'uncategorized' WHERE category IS NULL;
