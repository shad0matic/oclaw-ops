"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Search, Wrench, Clipboard, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

type Status = "valid" | "expired" | "missing"

function parseCookies(raw: string): { auth_token: string; ct0: string } {
  const authMatch = raw.match(/auth_token=([^;\s]+)/)
  const ct0Match = raw.match(/ct0=([^;\s]+)/)
  return {
    auth_token: authMatch?.[1] || "",
    ct0: ct0Match?.[1] || "",
  }
}

export function XTwitterSettings() {
  const [rawCookie, setRawCookie] = useState("")
  const [authToken, setAuthToken] = useState("")
  const [ct0, setCt0] = useState("")
  const [isGuideOpen, setIsGuideOpen] = useState(true)
  const [status, setStatus] = useState<Status>("missing")
  const [lastTested, setLastTested] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  
  const handlePaste = (value: string) => {
    setRawCookie(value)
    const parsed = parseCookies(value)
    if (parsed.auth_token) setAuthToken(parsed.auth_token)
    if (parsed.ct0) setCt0(parsed.ct0)
  }

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch("/api/settings/x-cookies")
        const data = await response.json()
        setStatus(data.status)
        setLastTested(data.lastTested)
        setUsername(data.username)
        if (data.cookies) {
          setAuthToken(data.cookies.auth_token || '');
          setCt0(data.cookies.ct0 || '');
        }
      } catch (error) {
        console.error("Failed to fetch status:", error)
      }
    }
    fetchStatus()
  }, [])
  
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/x-cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_token: authToken, ct0 }),
      });
      const data = await response.json();
      setStatus(data.status);
      setLastTested(data.lastTested);
      setUsername(data.username);
      toast("Settings Saved", {
        description: `Cookie status: ${data.status}`,
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast("Error", {
        description: "Failed to save settings.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTest = async () => {
    setIsTesting(true);
    try {
      const response = await fetch('/api/settings/x-cookies/test', {
        method: 'POST',
      });
      const data = await response.json();
       if (data.valid) {
        toast("Connection Successful", {
          description: `Successfully connected as @${data.username}`,
        });
        setStatus('valid');
        setUsername(data.username);
      } else {
        toast("Connection Failed", {
          description: data.error || "Please check your cookie values.",
        });
        setStatus('expired');
      }
      const statusResponse = await fetch("/api/settings/x-cookies");
      const statusData = await statusResponse.json();
      setLastTested(statusData.lastTested);
    } catch (error) {
      console.error('Failed to test connection:', error);
      toast("Error", {
        description: "Failed to test connection.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const StatusIndicator = () => {
    switch (status) {
      case "valid":
        return <span className="text-sm font-medium text-green-500">🟢 Valid{username && ` (@${username})`}</span>
      case "expired":
        return <span className="text-sm font-medium text-red-500">🔴 Expired</span>
      default:
        return <span className="text-sm font-medium">⚪ Not configured</span>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>X/Twitter Integration</CardTitle>
        <CardDescription>
          Configure your X/Twitter cookies to allow Phil to fetch content.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Collapsible open={isGuideOpen} onOpenChange={(isOpen) => {
            setIsGuideOpen(isOpen);
            localStorage.setItem('x-cookie-guide-collapsed', isOpen ? 'false' : 'true');
        }}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full">
              {isGuideOpen ? "Hide" : "Show"} Step-by-Step Guide
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <Search className="h-5 w-5 mt-1" />
              <div>
                <p className="font-semibold">Step 1: Open x.com</p>
                <p className="text-sm text-muted-foreground">
                  Open x.com in Chrome, make sure you're logged in.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <Wrench className="h-5 w-5 mt-1" />
              <div>
                <p className="font-semibold">Step 2: Open DevTools</p>
                <p className="text-sm text-muted-foreground">
                  Press F12 to open DevTools → go to Network tab.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <Clipboard className="h-5 w-5 mt-1" />
              <div>
                <p className="font-semibold">Step 3: Find Cookies</p>
                <p className="text-sm text-muted-foreground">
                  Click any request to x.com → look in Request Headers for `cookie:`.
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-4 border rounded-md">
              <Check className="h-5 w-5 mt-1" />
              <div>
                <p className="font-semibold">Step 4: Copy the whole cookie value</p>
                <p className="text-sm text-muted-foreground">
                  Copy the entire <code className="bg-muted px-1 rounded">cookie:</code> header value and paste it below. We'll extract what we need automatically.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="space-y-2">
          <Label>Raw Cookie Input</Label>
          <Input 
            placeholder="Paste full cookie string here"
            onChange={(e) => handlePaste(e.target.value)}
            value={rawCookie}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="auth_token">auth_token</Label>
          <Input id="auth_token" value={authToken} onChange={e => setAuthToken(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ct0">ct0 (csrf token)</Label>
          <Input id="ct0" value={ct0} onChange={e => setCt0(e.target.value)} />
        </div>
        
        <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Status:</span>
            <StatusIndicator />
            {lastTested && (
                <span className="text-xs text-muted-foreground">
                    (Last tested: {new Date(lastTested).toLocaleString()})
                </span>
            )}
        </div>

      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button variant="outline" onClick={handleTest} disabled={isTesting || !authToken || !ct0}>
            {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Test Connection
        </Button>
        <Button onClick={handleSave} disabled={isLoading || !authToken || !ct0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
        </Button>
      </CardFooter>
    </Card>
  )
}
