#!/usr/bin/env bash
# Wrapper around OpenClaw's Whisper skill that logs usage to ops.api_usage
# Usage: transcribe-tracked.sh <audio_file> [--agent <agent_id>] [other transcribe.sh flags...]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WHISPER_SCRIPT="/usr/lib/node_modules/openclaw/skills/openai-whisper-api/scripts/transcribe.sh"

audio_file=""
agent_id="unknown"
other_args=()

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --agent)
      agent_id="${2:-unknown}"
      shift 2
      ;;
    *)
      if [[ -z "$audio_file" && -f "$1" ]]; then
        audio_file="$1"
      else
        other_args+=("$1")
      fi
      shift
      ;;
  esac
done

if [[ -z "$audio_file" ]]; then
  echo "Usage: transcribe-tracked.sh <audio_file> [--agent <agent_id>] [transcribe.sh flags...]" >&2
  exit 1
fi

# Run transcription (use bash to bypass execute permission issues)
bash "$WHISPER_SCRIPT" "$audio_file" "${other_args[@]}"

# Log usage
"$SCRIPT_DIR/log-whisper-usage.sh" "$audio_file" "$agent_id"
