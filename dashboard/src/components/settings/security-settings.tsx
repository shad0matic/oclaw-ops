"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Globe, 
  FileText, 
  Eye,
  Plus,
  Trash2,
  RefreshCw
} from "lucide-react";

// Security configuration types
interface SecurityConfig {
  tailscaleEnabled: boolean;
  fileAllowlist: string[];
  networkEgressEnabled: boolean;
  allowedDomains: string[];
  auditLoggingEnabled: boolean;
}

interface AuditLogEntry {
  id: number;
  event_type: string;
  detail: JSON;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export function SecuritySettings() {
  const [config, setConfig] = useState<SecurityConfig>({
    tailscaleEnabled: true,
    fileAllowlist: [
      "/home/openclaw/.openclaw/workspace",
      "/home/openclaw/projects/oclaw-ops"
    ],
    networkEgressEnabled: true,
    allowedDomains: [
      "api.anthropic.com",
      "api.openai.com",
      "api.minimax.io",
      "generativelanguage.googleapis.com"
    ],
    auditLoggingEnabled: true
  });
  
  const [newPath, setNewPath] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAuditLog, setShowAuditLog] = useState(false);

  // Fetch current security config from database
  useEffect(() => {
    fetchSecurityConfig();
  }, []);

  const fetchSecurityConfig = async () => {
    try {
      const res = await fetch('/api/security/config');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(prev => ({ ...prev, ...data.config }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch security config:', error);
    }
  };

  const saveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/security/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        console.log('Security config saved');
      }
    } catch (error) {
      console.error('Failed to save security config:', error);
    } finally {
      setLoading(false);
    }
  };

  const addPath = () => {
    if (newPath && !config.fileAllowlist.includes(newPath)) {
      setConfig(prev => ({
        ...prev,
        fileAllowlist: [...prev.fileAllowlist, newPath]
      }));
      setNewPath("");
    }
  };

  const removePath = (path: string) => {
    setConfig(prev => ({
      ...prev,
      fileAllowlist: prev.fileAllowlist.filter(p => p !== path)
    }));
  };

  const addDomain = () => {
    if (newDomain && !config.allowedDomains.includes(newDomain)) {
      setConfig(prev => ({
        ...prev,
        allowedDomains: [...prev.allowedDomains, newDomain]
      }));
      setNewDomain("");
    }
  };

  const removeDomain = (domain: string) => {
    setConfig(prev => ({
      ...prev,
      allowedDomains: prev.allowedDomains.filter(d => d !== domain)
    }));
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/security/audit-logs');
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tailscale Status */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-400" />
              <CardTitle className="text-lg">Tailscale Secure Access</CardTitle>
            </div>
            <Badge variant="outline" className={config.tailscaleEnabled ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
              {config.tailscaleEnabled ? "Active" : "Inactive"}
            </Badge>
          </div>
          <CardDescription>
            Dashboard is accessible only via Tailscale network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              <p>Tailscale serves the dashboard on port 3000</p>
              <p className="font-mono text-xs mt-1">tailscale serve --https=3000 http://127.0.0.1:3000</p>
            </div>
            <Switch 
              checked={config.tailscaleEnabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, tailscaleEnabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* File Path Allowlist */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <CardTitle className="text-lg">File Path Allowlist</CardTitle>
          </div>
          <CardDescription>
            Restrict agent file access to these directories only
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="/path/to/allowed/directory"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPath()}
              className="bg-slate-800 border-slate-700"
            />
            <Button onClick={addPath} size="sm" variant="secondary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {config.fileAllowlist.map((path, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-md">
                <code className="text-xs text-gray-300">{path}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-red-400 hover:text-red-300"
                  onClick={() => removePath(path)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Egress Controls */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-lg">Network Egress Controls</CardTitle>
            </div>
            <Switch 
              checked={config.networkEgressEnabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, networkEgressEnabled: checked }))}
            />
          </div>
          <CardDescription>
            Whitelist allowed outbound domains for agent API calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input 
              placeholder="api.example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addDomain()}
              className="bg-slate-800 border-slate-700"
            />
            <Button onClick={addDomain} size="sm" variant="secondary">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {config.allowedDomains.map((domain, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded-md">
                <code className="text-xs text-gray-300">{domain}</code>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-red-400 hover:text-red-300"
                  onClick={() => removeDomain(domain)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Audit Logging */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-lg">Audit Logging</CardTitle>
            </div>
            <Switch 
              checked={config.auditLoggingEnabled}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, auditLoggingEnabled: checked }))}
            />
          </div>
          <CardDescription>
            Log sensitive operations for security review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Track file access, API calls, and admin actions
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setShowAuditLog(!showAuditLog);
                if (!showAuditLog) fetchAuditLogs();
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showAuditLog ? "Hide Logs" : "View Logs"}
            </Button>
          </div>
          
          {showAuditLog && (
            <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-gray-500">No audit logs yet</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2 bg-slate-800/50 rounded text-xs">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">{log.event_type}</Badge>
                      <span className="text-gray-500">{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    <pre className="mt-1 text-gray-400 overflow-x-auto">
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveConfig} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
          {loading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Shield className="h-4 w-4 mr-2" />
          )}
          Save Security Settings
        </Button>
      </div>
    </div>
  );
}
