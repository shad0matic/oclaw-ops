#!/bin/bash
# Incremental bookmark sync from X/Twitter to OpenClaw database
# Uses birdx to fetch bookmarks and psql to upsert them

set -e

DB_USER="shad"
DB_NAME="openclaw_db"
DB_SCHEMA="kb"
DB_TABLE="x_bookmarks"

echo "🔄 Starting X Bookmarks Sync at $(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Fetch all bookmarks
echo "📥 Fetching bookmarks from X/Twitter..."
BOOKMARKS_JSON=$(birdx bookmarks --all --json 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to fetch bookmarks"
    exit 1
fi

TOTAL_FETCHED=$(echo "$BOOKMARKS_JSON" | jq '. | length')
echo "✓ Fetched $TOTAL_FETCHED bookmarks"

# Process each bookmark and upsert
echo "💾 Processing and upserting bookmarks..."

# Convert JSON array to SQL INSERT statements
psql -U "$DB_USER" "$DB_NAME" <<EOF
BEGIN;

-- Create temporary table for new bookmarks
CREATE TEMP TABLE temp_bookmarks (
    tweet_id VARCHAR(255),
    author_id VARCHAR(255),
    author_name VARCHAR(255),
    tweet_text TEXT,
    full_json JSONB,
    url VARCHAR(1024)
);

-- Load bookmarks from jq output
EOF

# Parse JSON and insert into temp table
echo "$BOOKMARKS_JSON" | jq -r '.[] | [
    .id | tostring,
    .authorId | tostring,
    .author.username // "",
    .text // "",
    . | tojson,
    ("https://x.com/" + (.author.username // "") + "/status/" + (.id | tostring))
] | @tsv' | while IFS=$'\t' read -r tweet_id author_id author_name tweet_text full_json url; do
    
    # Escape single quotes for SQL
    tweet_text_escaped="${tweet_text//\'/\'\'}"
    author_name_escaped="${author_name//\'/\'\'}"
    
    psql -U "$DB_USER" "$DB_NAME" -c "
    INSERT INTO $DB_SCHEMA.$DB_TABLE (tweet_id, author_id, author_name, tweet_text, full_json, url)
    VALUES ('$tweet_id', '$author_id', '$author_name_escaped', '$tweet_text_escaped', '$full_json'::jsonb, '$url')
    ON CONFLICT (tweet_id) DO UPDATE SET
        tweet_text = EXCLUDED.tweet_text,
        full_json = EXCLUDED.full_json,
        author_name = EXCLUDED.author_name,
        archived_at = now()
    " 2>&1 | grep -v "^$" || true
done

echo ""
echo "✅ Sync complete!"

# Get final count
TOTAL_IN_DB=$(psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM $DB_SCHEMA.$DB_TABLE" | tr -d ' ')

echo "   - Fetched: $TOTAL_FETCHED"
echo "   - Total in DB: $TOTAL_IN_DB"
echo ""
