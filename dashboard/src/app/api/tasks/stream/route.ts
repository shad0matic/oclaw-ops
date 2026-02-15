export const dynamic = "force-dynamic"
import { pool } from "@/lib/drizzle"
import { NextRequest } from "next/server"

export async function GET(_request: NextRequest) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Dedicated connection for LISTEN
      const client = await pool.connect()
      let closed = false

      const cleanup = () => {
        if (closed) return
        closed = true
        try { client.release() } catch {}
        try { controller.close() } catch {}
      }

      try {
        await client.query("LISTEN task_changes")

        // Send heartbeat every 30s to keep connection alive
        const heartbeat = setInterval(() => {
          if (closed) { clearInterval(heartbeat); return }
          try {
            controller.enqueue(encoder.encode(": heartbeat\n\n"))
          } catch {
            clearInterval(heartbeat)
            cleanup()
          }
        }, 30_000)

        // Listen for notifications
        client.on("notification", (msg) => {
          if (closed) return
          try {
            controller.enqueue(encoder.encode(`data: ${msg.payload}\n\n`))
          } catch {
            cleanup()
          }
        })

        // Handle client disconnect
        _request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat)
          cleanup()
        })

      } catch (err) {
        cleanup()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
