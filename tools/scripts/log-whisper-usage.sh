#!/usr/bin/env bash
# Log Whisper API usage to ops.api_usage
# Usage: log-whisper-usage.sh <audio_file> [agent_id]

set -euo pipefail

audio_file="${1:-}"
agent_id="${2:-unknown}"

if [[ -z "$audio_file" || ! -f "$audio_file" ]]; then
  echo "Usage: log-whisper-usage.sh <audio_file> [agent_id]" >&2
  exit 1
fi

# Get duration in minutes using ffprobe
duration_sec=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$audio_file" 2>/dev/null || echo "0")
duration_min=$(awk "BEGIN {printf \"%.2f\", $duration_sec / 60}")

# Whisper-1 pricing: $0.006/minute
cost_usd=$(awk "BEGIN {printf \"%.4f\", $duration_min * 0.006}")

# Log to database
psql -U shad openclaw_db -c "
INSERT INTO ops.api_usage (service, operation, model, units, unit_type, cost_usd, agent_id, input_file)
VALUES ('openai-whisper', 'transcription', 'whisper-1', $duration_min, 'minutes', $cost_usd, '$agent_id', '$(basename "$audio_file")')
"

echo "Logged: ${duration_min} min → \$${cost_usd} USD"
