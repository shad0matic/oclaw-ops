/**
 * AgentEntity — Single source of truth for agent identity & state.
 *
 * Used by: dashboard components, overview, kanban, future isometric lab view.
 * Populated from: /api/agents/registry
 *
 * Design: immutable data object + static helpers. No React dependency so it
 * can be used in server components, hooks, and (later) game/canvas logic.
 */

// ─── Static metadata (not stored in DB) ────────────────────────────────
export const AGENT_META: Record<string, { name: string; emoji: string; role: string; color: string }> = {
  main:    { name: "Kevin",       emoji: "🍌", role: "Lead",        color: "#facc15" }, // yellow
  bob:     { name: "Bob",         emoji: "🎨", role: "UI/Frontend", color: "#3b82f6" }, // blue
  nefario: { name: "Dr. Nefario", emoji: "🔬", role: "Research",    color: "#a855f7" }, // purple
  xreader: { name: "X Reader",    emoji: "📰", role: "X/Twitter",   color: "#f97316" }, // orange
  stuart:  { name: "Stuart",      emoji: "🔒", role: "DB/Schema",   color: "#6b7280" }, // gray
  mel:     { name: "Mel",         emoji: "🚔", role: "Security",    color: "#ef4444" }, // red
  dave:    { name: "Dave",        emoji: "💰", role: "Cost Watch",  color: "#22c55e" }, // green
  oracle:  { name: "Oracle",      emoji: "🔮", role: "Analysis",    color: "#8b5cf6" }, // violet
  phil:    { name: "Phil",        emoji: "🎯", role: "QA",          color: "#06b6d4" }, // cyan
  echo:    { name: "Echo",        emoji: "🎙️", role: "Voice",       color: "#ec4899" }, // pink
  smaug:   { name: "Smaug",       emoji: "🐉", role: "Treasury",    color: "#f59e0b" }, // amber
}

const DEFAULT_META = { name: "Minion", emoji: "🤖", role: "Agent", color: "#94a3b8" }

// ─── Types ──────────────────────────────────────────────────────────────
export type AgentStatus = 'active' | 'idle' | 'error' | 'zombie'

export interface AgentData {
  id: string
  name: string
  emoji: string
  role: string
  color: string
  description: string
  level: number
  trustScore: number
  totalTasks: number
  successfulTasks: number
  avatarUrl: string
  status: AgentStatus
  currentTask: string | null
  currentModel: string | null
}

// ─── Entity class ───────────────────────────────────────────────────────
export class AgentEntity {
  readonly id: string
  readonly name: string
  readonly emoji: string
  readonly role: string
  readonly color: string
  readonly description: string
  readonly level: number
  readonly trustScore: number
  readonly totalTasks: number
  readonly successfulTasks: number
  readonly avatarUrl: string
  readonly status: AgentStatus
  readonly currentTask: string | null
  readonly currentModel: string | null

  constructor(data: AgentData) {
    this.id = data.id
    this.name = data.name
    this.emoji = data.emoji
    this.role = data.role
    this.color = data.color
    this.description = data.description
    this.level = data.level
    this.trustScore = data.trustScore
    this.totalTasks = data.totalTasks
    this.successfulTasks = data.successfulTasks
    this.avatarUrl = data.avatarUrl
    this.status = data.status
    this.currentTask = data.currentTask
    this.currentModel = data.currentModel
  }

  // ─── Computed properties ────────────────────────────────────────────

  get isActive(): boolean {
    return this.status === 'active'
  }

  get isZombie(): boolean {
    return this.status === 'zombie'
  }

  get successRate(): number {
    if (this.totalTasks === 0) return 0
    return Math.round((this.successfulTasks / this.totalTasks) * 100)
  }

  get trustPercent(): number {
    return Math.round(this.trustScore * 100)
  }

  get initials(): string {
    return this.name.slice(0, 2).toUpperCase()
  }

  get displayName(): string {
    return `${this.emoji} ${this.name}`
  }

  get label(): string {
    return `${this.name} (${this.role})`
  }

  // For future isometric lab view
  get mood(): 'happy' | 'busy' | 'bored' | 'stressed' | 'dead' {
    if (this.isZombie) return 'dead'
    if (this.status === 'error') return 'stressed'
    if (this.isActive && this.trustScore > 0.7) return 'busy'
    if (this.isActive) return 'happy'
    return 'bored'
  }

  // ─── Static helpers ─────────────────────────────────────────────────

  /** Get metadata for an agent ID (even if not in DB) */
  static getMeta(agentId: string): typeof DEFAULT_META {
    return AGENT_META[agentId] || { ...DEFAULT_META, name: agentId }
  }

  /** Get display name for an agent ID */
  static getName(agentId: string): string {
    return AGENT_META[agentId]?.name || agentId
  }

  /** Resolve avatar URL for an agent ID (client-side, no fs check) */
  static avatarUrl(agentId: string): string {
    return `/assets/minion-avatars/${agentId}.webp`
  }

  static defaultAvatarUrl(): string {
    return `/assets/minion-avatars/default.webp`
  }

  /** Get agent info including ID — useful for iteration */
  static getAgent(agentId: string): { id: string; name: string; emoji: string; role: string; color: string } {
    const meta = AgentEntity.getMeta(agentId)
    return { id: agentId, ...meta }
  }

  /** Create from API response row */
  static fromRow(row: any): AgentEntity {
    const meta = AgentEntity.getMeta(row.agent_id || row.id)
    return new AgentEntity({
      id: row.agent_id || row.id,
      name: row.name || row.agent_id || row.id,
      emoji: meta.emoji,
      role: meta.role,
      color: meta.color,
      description: row.description || "",
      level: row.level || 1,
      trustScore: Number(row.trust_score ?? row.trustScore ?? 0.5),
      totalTasks: row.total_tasks ?? row.totalTasks ?? 0,
      successfulTasks: row.successful_tasks ?? row.successfulTasks ?? 0,
      avatarUrl: row.avatarUrl || `/assets/minion-avatars/${row.agent_id || row.id}.webp`,
      status: row.status || 'idle',
      currentTask: row.current_label ?? row.currentTask ?? null,
      currentModel: row.current_model ?? row.currentModel ?? null,
    })
  }

  /** Serialize back to plain object (for JSON / props) */
  toJSON(): AgentData {
    return {
      id: this.id,
      name: this.name,
      emoji: this.emoji,
      role: this.role,
      color: this.color,
      description: this.description,
      level: this.level,
      trustScore: this.trustScore,
      totalTasks: this.totalTasks,
      successfulTasks: this.successfulTasks,
      avatarUrl: this.avatarUrl,
      status: this.status,
      currentTask: this.currentTask,
      currentModel: this.currentModel,
    }
  }
}
