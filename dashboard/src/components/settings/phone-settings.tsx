"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneCall, MessageSquare, Save, AlertCircle, CheckCircle } from "lucide-react"
import { toast } from "sonner"

interface PhoneSettings {
  phoneNumber: string
  twilioAccountSid: string
  twilioAuthToken?: string
  twilioApiKey?: string
  twilioApiSecret?: string
  bossPhoneNumber: string
  voicemailGreeting: string
  enabled: boolean
  voiceEnabled: boolean
}

export function PhoneSettings() {
  const [settings, setSettings] = useState<PhoneSettings>({
    phoneNumber: "",
    twilioAccountSid: "",
    twilioApiKey: "",
    bossPhoneNumber: "",
    voicemailGreeting: "Hello, this is OpenClaw. Please leave a message.",
    enabled: false,
    voiceEnabled: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [calling, setCalling] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/settings/phone")
      if (res.ok) {
        const data = await res.json()
        if (data.settings) {
          setSettings(prev => ({ ...prev, ...data.settings }))
        }
      }
    } catch (e) {
      console.error("Failed to fetch phone settings:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveSettings = async () => {
    try {
      setSaving(true)
      const res = await fetch("/api/settings/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          toast.success("Phone settings saved successfully")
        } else {
          toast.error(data.error || "Failed to save settings")
        }
      } else {
        toast.error("Failed to save settings")
      }
    } catch (e) {
      console.error("Failed to save phone settings:", e)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const testCall = async () => {
    if (!settings.bossPhoneNumber) {
      toast.error("Please enter a phone number to call")
      return
    }
    if (!settings.enabled) {
      toast.error("Please enable phone calls first")
      return
    }

    try {
      setCalling(true)
      const res = await fetch("/api/phone/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNumber: settings.bossPhoneNumber,
          message: "This is a test call from OpenClaw. Your phone integration is working correctly.",
        }),
      })
      
      const data = await res.json()
      if (data.success) {
        toast.success(`Test call initiated! Call SID: ${data.callSid}`)
      } else {
        toast.error(data.error || "Failed to initiate call")
      }
    } catch (e) {
      console.error("Test call failed:", e)
      toast.error("Failed to initiate test call")
    } finally {
      setCalling(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-cyan-500" />
              <CardTitle className="text-zinc-100">ClawdTalk Phone</CardTitle>
            </div>
            <Badge variant={settings.enabled ? "default" : "secondary"} className={settings.enabled ? "bg-green-500/10 text-green-500" : "bg-zinc-700 text-zinc-400"}>
              {settings.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
          <CardDescription className="text-zinc-400">
            Dedicated phone number for OpenClaw to call you for urgent issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-zinc-300">Enable Phone Calls</Label>
              <p className="text-sm text-zinc-500">Allow OpenClaw to make and receive calls</p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-zinc-300">Voice Interaction</Label>
              <p className="text-sm text-zinc-500">Enable voice greetings and voicemail</p>
            </div>
            <Switch
              checked={settings.voiceEnabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, voiceEnabled: checked }))}
              disabled={!settings.enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configuration Card */}
      {settings.enabled && (
        <>
          {/* Phone Number */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-cyan-500" />
                <CardTitle className="text-zinc-100">Phone Number</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Your Twilio Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={settings.phoneNumber}
                  onChange={(e) => setSettings(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100"
                />
                <p className="text-xs text-zinc-500">Your dedicated Twilio phone number (e.g., +1234567890)</p>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-300">Boss Phone Number</Label>
                <Input
                  placeholder="+1234567890"
                  value={settings.bossPhoneNumber}
                  onChange={(e) => setSettings(prev => ({ ...prev, bossPhoneNumber: e.target.value }))}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100"
                />
                <p className="text-xs text-zinc-500">Your personal number - OpenClaw will call you for urgent issues</p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-zinc-100 hover:text-cyan-400 transition-colors"
              >
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-zinc-100">Twilio Configuration</CardTitle>
              </button>
            </CardHeader>
            {showAdvanced && (
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-zinc-300">Account SID</Label>
                  <Input
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.twilioAccountSid}
                    onChange={(e) => setSettings(prev => ({ ...prev, twilioAccountSid: e.target.value }))}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Auth Token</Label>
                  <Input
                    type="password"
                    placeholder="Your Twilio Auth Token"
                    value={settings.twilioAuthToken || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, twilioAuthToken: e.target.value }))}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">API Key (Optional for better security)</Label>
                  <Input
                    placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={settings.twilioApiKey || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, twilioApiKey: e.target.value }))}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">API Secret (Optional)</Label>
                  <Input
                    type="password"
                    placeholder="Your Twilio API Key Secret"
                    value={settings.twilioApiSecret || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, twilioApiSecret: e.target.value }))}
                    className="bg-zinc-950 border-zinc-800 text-zinc-100 font-mono"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Voicemail Settings */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-cyan-500" />
                <CardTitle className="text-zinc-100">Voicemail Greeting</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Greeting Message</Label>
                <Textarea
                  placeholder="Hello, this is OpenClaw. Please leave a message."
                  value={settings.voicemailGreeting}
                  onChange={(e) => setSettings(prev => ({ ...prev, voicemailGreeting: e.target.value }))}
                  className="bg-zinc-950 border-zinc-800 text-zinc-100"
                  rows={3}
                />
                <p className="text-xs text-zinc-500">This message will play when someone calls your OpenClaw number</p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={saveSettings}
              disabled={saving}
              className="bg-cyan-600 hover:bg-cyan-500"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              onClick={testCall}
              disabled={calling || !settings.phoneNumber || !settings.twilioAccountSid}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <PhoneCall className="h-4 w-4 mr-2" />
              {calling ? "Calling..." : "Test Call"}
            </Button>
          </div>

          {/* Info Box */}
          <Card className="bg-cyan-900/10 border-cyan-800/50">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm text-cyan-200 font-medium">Setup Instructions</p>
                  <ol className="text-xs text-cyan-300/70 space-y-1 list-decimal list-inside">
                    <li>Create a Twilio account at twilio.com</li>
                    <li>Get a phone number from Twilio</li>
                    <li>Configure your webhook URL in Twilio: <code className="bg-zinc-800 px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : ''}/api/phone/webhook</code></li>
                    <li>Enter your credentials above and save</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
