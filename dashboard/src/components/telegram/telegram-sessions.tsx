"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, RefreshCw } from "lucide-react"
import { toast } from "sonner"

interface TelegramSession {
  id: number
  agentId: string
  sessionKey: string
  label: string
  totalTokens: number
  isActive: boolean
  updatedAt: string
}

export function TelegramSessions() {
  const [sessions, setSessions] = useState<TelegramSession[]>([])
  const [loading, setLoading] = useState(false)
  const [killing, setKilling] = useState<Set<string>>(new Set())

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/telegram/sessions")
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions)
      }
    } catch (e) {
      console.error("Failed to fetch Telegram sessions:", e)
      toast.error("Failed to fetch Telegram sessions")
    } finally {
      setLoading(false)
    }
  }, [])

  const killSession = async (sessionKey: string) => {
    try {
      setKilling(prev => new Set(prev).add(sessionKey))
      const res = await fetch("/api/telegram/sessions/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKeys: [sessionKey] }),
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        // Refresh the list
        await fetchSessions()
      } else {
        toast.error("Failed to kill session")
      }
    } catch (e) {
      console.error("Failed to kill session:", e)
      toast.error("Failed to kill session")
    } finally {
      setKilling(prev => {
        const next = new Set(prev)
        next.delete(sessionKey)
        return next
      })
    }
  }

  const killAllInactive = async () => {
    const inactiveSessions = sessions.filter(s => !s.isActive)
    if (inactiveSessions.length === 0) {
      toast.info("No inactive sessions to kill")
      return
    }

    try {
      setLoading(true)
      const res = await fetch("/api/telegram/sessions/kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionKeys: inactiveSessions.map(s => s.sessionKey) 
        }),
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success(data.message)
        await fetchSessions()
      } else {
        toast.error("Failed to kill sessions")
      }
    } catch (e) {
      console.error("Failed to kill sessions:", e)
      toast.error("Failed to kill sessions")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-zinc-400">Telegram Sessions</CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchSessions}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={killAllInactive}
              disabled={loading || sessions.filter(s => !s.isActive).length === 0}
            >
              Kill All Inactive
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-zinc-500 text-center py-8">No Telegram sessions found</div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-zinc-950/50 border border-zinc-800"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-white truncate">
                      {session.label}
                    </span>
                    <Badge 
                      variant={session.isActive ? "default" : "secondary"}
                      className={session.isActive ? "bg-green-500/10 text-green-500" : "bg-zinc-700 text-zinc-400"}
                    >
                      {session.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    <span className="mr-3">Agent: {session.agentId}</span>
                    <span className="mr-3">Tokens: {session.totalTokens.toLocaleString()}</span>
                    <span>Updated: {new Date(session.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => killSession(session.sessionKey)}
                  disabled={killing.has(session.sessionKey)}
                  className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
