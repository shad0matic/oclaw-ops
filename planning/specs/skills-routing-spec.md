# Skills Routing Decision Matrix

**Author:** Kevin 🍌  
**Date:** 18/02/2026  
**Status:** Draft  
**Task:** [#58](https://mc.clawd.ai/kanban?task=58)

---

## Overview

This spec defines WHEN to use each OpenClaw skill and WHEN NOT TO. Skills are specialized instruction sets that enhance agent capabilities for specific domains.

---

## 1. gog (Google Workspace) 🎮

**Description:** CLI for Gmail, Calendar, Drive, Contacts, Sheets, and Docs.

### Use When:
- User asks to read/send emails
- Calendar queries: "What's on my schedule?", "Add meeting tomorrow"
- Drive operations: upload, download, search files
- Contacts lookup or management
- Sheets data manipulation
- Docs creation/editing

### Don't Use When:
- Generic web search (use web_search instead)
- Non-Google email providers (Outlook, etc.)
- Local file operations (use Read/Write tools)
- User hasn't set up OAuth credentials

### Example Triggers:
- "Check my email"
- "What meetings do I have today?"
- "Upload this file to Drive"
- "Send an email to..."
- "Find John's phone number"

---

## 2. healthcheck 🔒

**Description:** Host security hardening and risk-tolerance configuration.

### Use When:
- User asks for security audit
- Firewall/SSH hardening requests
- System update review
- Risk posture assessment
- OpenClaw deployment security review
- "Is my server secure?"

### Don't Use When:
- Application-level security (code review, etc.)
- Network penetration testing
- Non-OpenClaw host systems
- Quick checks that don't need full audit

### Example Triggers:
- "Run a security audit"
- "Harden my VPS"
- "Check my SSH config"
- "Is my firewall configured correctly?"
- "Review my server's risk exposure"

---

## 3. openai-image-gen 🎨

**Description:** Batch-generate images via OpenAI Images API with gallery output.

### Use When:
- User requests AI-generated images
- Batch image generation needed
- Creating visual assets with random prompt variations
- Building image galleries

### Don't Use When:
- Analyzing existing images (use image tool)
- Simple single-image requests (can use API directly)
- Non-OpenAI image generation
- Photo editing/manipulation

### Example Triggers:
- "Generate 10 variations of..."
- "Create a batch of product images"
- "Make me some AI art"
- "Build an image gallery"

---

## 4. openai-whisper-api 🎤

**Description:** Transcribe audio via OpenAI Whisper API.

### Use When:
- Audio file needs transcription
- Video audio extraction + transcription
- Voice memo processing
- Podcast/meeting transcription
- Files under 25MB (or after compression)

### Don't Use When:
- Real-time speech recognition
- Audio already has text/subtitles available
- File is >25MB and can't be compressed/split
- Non-speech audio (music analysis, etc.)

### Example Triggers:
- "Transcribe this audio"
- "What does this recording say?"
- "Convert this voice memo to text"
- "Extract text from this video"

**Note:** Compress audio to 64kbps mono before upload. Split files >25MB into chunks.

---

## 5. skill-creator 🔧

**Description:** Create or update AgentSkills with scripts, references, and assets.

### Use When:
- Building a new skill from scratch
- Packaging existing workflow as reusable skill
- Structuring skill with SKILL.md + assets
- Publishing to ClawhHub

### Don't Use When:
- Simple one-off scripts (just write them)
- Modifying existing skills (edit directly)
- User just needs help, not a packaged skill

### Example Triggers:
- "Create a skill for..."
- "Package this workflow as a skill"
- "Build a reusable skill"
- "I want to publish this to ClawhHub"

---

## 6. video-frames 🎬

**Description:** Extract frames or short clips from videos using ffmpeg.

### Use When:
- Need specific frames from video
- Creating thumbnails from video
- Extracting clip segments
- Frame-by-frame analysis prep

### Don't Use When:
- Full video transcription (use whisper-api)
- Video format conversion (use ffmpeg directly)
- Video editing (complex operations)
- Streaming video analysis

### Example Triggers:
- "Extract frames from this video"
- "Get a screenshot at 2:30"
- "Clip the first 30 seconds"
- "Create thumbnails from this"

---

## 7. weather 🌤️

**Description:** Get current weather and forecasts (no API key required).

### Use When:
- Current weather queries
- Forecast requests
- Location-based weather info
- Quick weather checks

### Don't Use When:
- Historical weather data
- Complex meteorological analysis
- Weather alerts/warnings (use dedicated services)
- Integration with other systems

### Example Triggers:
- "What's the weather?"
- "Will it rain tomorrow?"
- "Weather in Paris"
- "Do I need an umbrella?"

---

## Quick Reference Table

| Skill | Domain | Key Signal |
|-------|--------|------------|
| gog | Google Workspace | Email, calendar, drive, sheets |
| healthcheck | Security | Audit, hardening, firewall, SSH |
| openai-image-gen | Image creation | Batch images, gallery |
| openai-whisper-api | Transcription | Audio/video to text |
| skill-creator | Meta/tooling | Build reusable skills |
| video-frames | Video processing | Frames, clips, thumbnails |
| weather | Weather | Current/forecast conditions |

---

## Decision Flow

```
User Request
    │
    ├─ Mentions Google service? → gog
    ├─ Security/hardening? → healthcheck  
    ├─ Generate images? → openai-image-gen
    ├─ Transcribe audio/video? → openai-whisper-api
    ├─ Create/package skill? → skill-creator
    ├─ Extract video frames? → video-frames
    ├─ Weather query? → weather
    └─ None match → No skill needed, use base tools
```

---

## Data Retention

Skills themselves don't store persistent data. Any generated artifacts follow standard workspace cleanup policies (see individual project retention specs).
