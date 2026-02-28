#!/bin/bash
# sync-keys-from-env.sh - Update agent auth files from .env
# Run after key rotation or on gateway startup

set -e

ENV_FILE="$HOME/.openclaw/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# Load env vars
source "$ENV_FILE"

# Update Google API key in all agent auth files
if [ -n "$GOOGLE_API_KEY" ]; then
  echo "Updating GOOGLE_API_KEY in agent auth files..."
  
  for auth_file in ~/.openclaw/agents/*/agent/auth-profiles.json ~/.openclaw/agents/agents/*/agent/auth-profiles.json; do
    if [ -f "$auth_file" ]; then
      # Replace any existing Google API key or ${GOOGLE_API_KEY} placeholder
      sed -i "s/\"key\": \"AIza[^\"]*\"/\"key\": \"$GOOGLE_API_KEY\"/" "$auth_file"
      sed -i "s/\"key\": \"\${GOOGLE_API_KEY}\"/\"key\": \"$GOOGLE_API_KEY\"/" "$auth_file"
    fi
  done
  
  echo "✅ Updated Google API key in $(find ~/.openclaw/agents -name 'auth-profiles.json' | wc -l) files"
fi

# Add other keys as needed (OpenAI, Brave, etc.)
# if [ -n "$OPENAI_API_KEY" ]; then
#   ...
# fi

echo "✅ Key sync complete"
