-- Security hardening tables

-- Security configuration table
CREATE TABLE IF NOT EXISTS ops.security_config (
    id SERIAL PRIMARY KEY,
    tailscale_enabled BOOLEAN DEFAULT true,
    file_allowlist TEXT[] DEFAULT '{}',
    network_egress_enabled BOOLEAN DEFAULT true,
    allowed_domains TEXT[] DEFAULT '{}',
    audit_logging_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS ops.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type TEXT NOT NULL,
    detail JSONB DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,
    agent_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_type ON ops.audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON ops.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_agent ON ops.audit_logs(agent_id);

-- Insert default security config if not exists
INSERT INTO ops.security_config (tailscale_enabled, file_allowlist, network_egress_enabled, allowed_domains, audit_logging_enabled)
SELECT true, ARRAY['/home/openclaw/.openclaw/workspace', '/home/openclaw/projects/oclaw-ops'], true, ARRAY['api.anthropic.com', 'api.openai.com', 'api.minimax.io', 'generativelanguage.googleapis.com'], true
WHERE NOT EXISTS (SELECT 1 FROM ops.security_config LIMIT 1);
