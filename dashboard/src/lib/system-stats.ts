import { readFileSync } from "fs"

export function getCpuLoad(): number {
  try {
    const stat = readFileSync("/proc/stat", "utf8")
    const line = stat.split("\n")[0] // "cpu  user nice system idle ..."
    const parts = line.split(/\s+/).slice(1).map(Number)
    const idle = parts[3]
    const total = parts.reduce((a, b) => a + b, 0)
    // This is cumulative, so we return a rough estimate
    // For instant reading, return 0 and let the WS sparkline handle real-time
    return total > 0 ? Math.round((1 - idle / total) * 1000) / 10 : 0
  } catch { return 0 }
}

export function getMemStats(): { active: number; total: number } {
  try {
    const meminfo = readFileSync("/proc/meminfo", "utf8")
    const lines = Object.fromEntries(
      meminfo.split("\n").filter(Boolean).map(l => {
        const [key, val] = l.split(":")
        return [key.trim(), parseInt(val.trim()) * 1024] // kB → bytes
      })
    )
    const total = lines["MemTotal"] || 0
    const available = lines["MemAvailable"] || 0
    return { active: total - available, total }
  } catch { return { active: 0, total: 0 } }
}

export function getUptime(): number {
  try {
    const uptime = readFileSync("/proc/uptime", "utf8")
    return Math.floor(parseFloat(uptime.split(" ")[0]))
  } catch { return 0 }
}

export function getLoadAvg(): number[] {
  try {
    const data = readFileSync("/proc/loadavg", "utf8")
    const parts = data.split(/\s+/)
    return [parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2])]
  } catch { return [0, 0, 0] }
}

export function getCoreCount(): number {
  try {
    const cpuinfo = readFileSync("/proc/cpuinfo", "utf8")
    return (cpuinfo.match(/^processor\s/gm) || []).length || 1
  } catch { return 1 }
}

// Dashboard process start time (module-level = set once when Next.js loads)
const DASHBOARD_START = Date.now()

export function getDashboardUptime(): number {
  return Math.floor((Date.now() - DASHBOARD_START) / 1000)
}
