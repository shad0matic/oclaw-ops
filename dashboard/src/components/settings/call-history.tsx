"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, MessageSquare, Play, ExternalLink, RefreshCw, Mic, Clock } from "lucide-react"
import { toast } from "sonner"

interface Call {
  id: number
  fromNumber: string
  toNumber: string
  direction: "inbound" | "outbound"
  status: string
  duration: number | null
  recordingUrl: string | null
  transcription: string | null
  agentId: string
  sessionKey: string | null
  createdAt: string
  endedAt: string | null
}

function formatPhoneNumber(phone: string): string {
  if (!phone) return "Unknown"
  // Format as +X XXX XXX XXXX
  if (phone.startsWith("+")) {
    return phone // Already formatted
  }
  return phone
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-"
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}m ${secs}s`
  }
  return `${secs}s`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-500/10 text-green-500"
    case "answered":
    case "in-progress":
      return "bg-blue-500/10 text-blue-500"
    case "ringing":
      return "bg-yellow-500/10 text-yellow-500"
    case "failed":
    case "busy":
    case "no-answer":
    case "canceled":
      return "bg-red-500/10 text-red-500"
    default:
      return "bg-zinc-500/10 text-zinc-500"
  }
}

export function CallHistory() {
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/phone/calls")
      if (res.ok) {
        const data = await res.json()
        setCalls(data.calls || [])
      }
    } catch (e) {
      console.error("Failed to fetch calls:", e)
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCalls = async () => {
    try {
      setRefreshing(true)
      await fetchCalls()
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  const playRecording = (url: string) => {
    if (url) {
      window.open(url, "_blank")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-cyan-500" />
            <CardTitle className="text-zinc-100">Call History</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshCalls}
            disabled={refreshing}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription className="text-zinc-400">
          Recent phone calls and voicemail recordings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <div className="text-center py-8 text-zinc-500">
            <Phone className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No calls yet</p>
            <p className="text-sm">Make or receive calls to see them here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                {/* Direction Icon */}
                <div className={`mt-1 p-2 rounded-full ${
                  call.direction === "inbound" 
                    ? "bg-green-500/10" 
                    : "bg-blue-500/10"
                }`}>
                  {call.direction === "inbound" ? (
                    <PhoneIncoming className="h-4 w-4 text-green-500" />
                  ) : (
                    <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                  )}
                </div>

                {/* Call Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-100">
                      {call.direction === "inbound" ? formatPhoneNumber(call.fromNumber) : formatPhoneNumber(call.toNumber)}
                    </span>
                    <Badge className={getStatusColor(call.status)}>
                      {call.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(call.createdAt)}
                    </span>
                    {call.duration !== null && (
                      <span className="flex items-center gap-1">
                        {formatDuration(call.duration)}
                      </span>
                    )}
                  </div>
                  
                  {/* Transcription */}
                  {call.transcription && (
                    <div className="mt-2 p-2 rounded bg-zinc-900 border border-zinc-800">
                      <p className="text-sm text-zinc-300 line-clamp-2">
                        <Mic className="h-3 w-3 inline mr-1" />
                        {call.transcription}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {call.recordingUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => playRecording(call.recordingUrl!)}
                    className="text-zinc-400 hover:text-zinc-100"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
