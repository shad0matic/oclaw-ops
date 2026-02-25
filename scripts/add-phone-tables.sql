-- Phone calls table - stores phone call history
CREATE TABLE IF NOT EXISTS ops.phone_calls (
    id SERIAL PRIMARY KEY,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    status TEXT DEFAULT 'pending',
    duration INTEGER,
    recording_url TEXT,
    transcription TEXT,
    agent_id TEXT DEFAULT 'main',
    session_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_phone_calls_from ON ops.phone_calls(from_number);
CREATE INDEX IF NOT EXISTS idx_phone_calls_to ON ops.phone_calls(to_number);
CREATE INDEX IF NOT EXISTS idx_phone_calls_status ON ops.phone_calls(status);
CREATE INDEX IF NOT EXISTS idx_phone_calls_created ON ops.phone_calls(created_at DESC);

-- Phone settings table - stores Twilio configuration and phone number
CREATE TABLE IF NOT EXISTS ops.phone_settings (
    id SERIAL PRIMARY KEY,
    phone_number TEXT,
    twilio_account_sid TEXT,
    twilio_auth_token TEXT,
    twilio_api_key TEXT,
    twilio_api_secret TEXT,
    boss_phone_number TEXT,
    voicemail_greeting TEXT DEFAULT 'Hello, this is OpenClaw. Please leave a message.',
    enabled BOOLEAN DEFAULT FALSE,
    voice_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
