"use client"

import React from 'react'

// --- Types ---
type AgentStatus = 'idle' | 'active' | 'zombie' | 'dead'

interface SubSpawn {
  id: string
  name: string
  status: AgentStatus
}

interface Agent {
  id: string
  name: string
  emoji: string
  status: AgentStatus
  currentTask?: string
  subSpawns?: SubSpawn[]
}

// --- Mock Data ---
const mockAgents: Agent[] = [
  { id: 'kevin', name: 'Kevin', emoji: '🍌', status: 'active', currentTask: 'Planning feature pack', subSpawns: [
    { id: 'sub-1', name: 'Cost Audit', status: 'active' }
  ]},
  { id: 'nefario', name: 'Dr. Nefario', emoji: '🔬', status: 'active', currentTask: 'Researching cost estimation' },
  { id: 'bob', name: 'Bob', emoji: '🎨', status: 'idle' },
  { id: 'xreader', name: 'X Reader', emoji: '📰', status: 'zombie' },
]

// --- Room definitions (isometric diamond shapes) ---
const ROOMS = {
  lounge:   { cx: 150, cy: 380, w: 200, h: 120, label: '🛋️ Idle Lounge', color: '#3f3f46' },
  active:   { cx: 400, cy: 250, w: 280, h: 160, label: '💻 Active Room', color: '#854d0e' },
  warRoom:  { cx: 650, cy: 120, w: 180, h: 110, label: '⚔️ War Room', color: '#991b1b' },
  graveyard:{ cx: 650, cy: 400, w: 120, h: 80, label: '🪦 Graveyard', color: '#27272a' },
}

// Map status to room
const STATUS_ROOM: Record<AgentStatus, keyof typeof ROOMS> = {
  idle: 'lounge',
  active: 'active',
  zombie: 'active', // zombies are in active room with alarm
  dead: 'graveyard',
}

// Isometric diamond path from center point
function diamondPath(cx: number, cy: number, w: number, h: number) {
  return `M ${cx} ${cy - h/2} L ${cx + w/2} ${cy} L ${cx} ${cy + h/2} L ${cx - w/2} ${cy} Z`
}

// Position agents within a room, spread evenly
function getAgentPos(roomKey: keyof typeof ROOMS, index: number, total: number) {
  const room = ROOMS[roomKey]
  const spread = Math.min(total, 4)
  const offsetX = (index - (spread - 1) / 2) * 50
  const offsetY = (index - (spread - 1) / 2) * 20
  return { x: room.cx + offsetX, y: room.cy + offsetY + 15 }
}

// --- Room Component ---
function Room({ roomKey }: { roomKey: keyof typeof ROOMS }) {
  const r = ROOMS[roomKey]
  return (
    <g>
      <path
        d={diamondPath(r.cx, r.cy, r.w, r.h)}
        fill={r.color}
        fillOpacity={0.15}
        stroke={r.color}
        strokeWidth={1.5}
        strokeOpacity={0.6}
      />
      <text x={r.cx} y={r.cy - r.h/2 + 18} fill="#a1a1aa" fontSize={11} textAnchor="middle" fontWeight="bold">
        {r.label}
      </text>
    </g>
  )
}

// --- Agent Sprite ---
function AgentSprite({ agent, x, y }: { agent: Agent; x: number; y: number }) {
  const isZombie = agent.status === 'zombie'
  const isActive = agent.status === 'active'

  return (
    <g>
      {/* Glow for active agents */}
      {isActive && (
        <circle cx={x} cy={y} r={22} fill="#eab308" fillOpacity={0.15}>
          <animate attributeName="fillOpacity" values="0.1;0.25;0.1" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Zombie alarm flash */}
      {isZombie && (
        <circle cx={x + 18} cy={y - 18} r={5} fill="#ef4444">
          <animate attributeName="opacity" values="1;0.2;1" dur="0.5s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Agent emoji */}
      <text x={x} y={y} fontSize={28} textAnchor="middle" dominantBaseline="central"
        style={{ filter: isZombie ? 'saturate(0.3) brightness(0.6)' : 'none' }}>
        {agent.emoji}
      </text>

      {/* Zombie overlay */}
      {isZombie && (
        <text x={x + 12} y={y - 10} fontSize={14} textAnchor="middle" dominantBaseline="central">
          🧟
        </text>
      )}

      {/* Name label */}
      <text x={x} y={y + 22} fill="#d4d4d8" fontSize={9} textAnchor="middle" fontWeight="500">
        {agent.name}
      </text>

      {/* Current task */}
      {agent.currentTask && (
        <text x={x} y={y + 33} fill="#71717a" fontSize={7} textAnchor="middle">
          {agent.currentTask.length > 25 ? agent.currentTask.slice(0, 25) + '…' : agent.currentTask}
        </text>
      )}

      {/* Sub-spawns */}
      {agent.subSpawns?.map((sub, i) => (
        <g key={sub.id}>
          {/* Dotted line to parent */}
          <line x1={x + 20} y1={y} x2={x + 40 + i * 30} y2={y - 15}
            stroke="#71717a" strokeWidth={1} strokeDasharray="3,3" />
          {/* Mini bubble */}
          <circle cx={x + 40 + i * 30} cy={y - 15} r={12} fill="#27272a" stroke="#3f3f46" strokeWidth={1} />
          <text x={x + 40 + i * 30} y={y - 15} fontSize={10} textAnchor="middle" dominantBaseline="central">
            ⚡
          </text>
          <text x={x + 40 + i * 30} y={y - 1} fill="#71717a" fontSize={6} textAnchor="middle">
            {sub.name}
          </text>
        </g>
      ))}
    </g>
  )
}

// --- Grid lines (isometric floor) ---
function IsoGrid() {
  const lines = []
  for (let i = 0; i < 10; i++) {
    const y = 50 + i * 45
    lines.push(
      <line key={`h${i}`} x1={50} y1={y} x2={750} y2={y} stroke="#27272a" strokeWidth={0.5} />
    )
  }
  for (let i = 0; i < 12; i++) {
    const x = 50 + i * 65
    lines.push(
      <line key={`v${i}`} x1={x} y1={50} x2={x} y2={460} stroke="#27272a" strokeWidth={0.5} />
    )
  }
  return <g opacity={0.4}>{lines}</g>
}

// --- Main Component ---
export function IsometricOffice({ agents }: { agents: Agent[] }) {
  // Group agents by their target room
  const agentsByRoom: Record<string, Agent[]> = {}
  agents.forEach(a => {
    const room = STATUS_ROOM[a.status]
    if (!agentsByRoom[room]) agentsByRoom[room] = []
    agentsByRoom[room].push(a)
  })

  return (
    <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      <svg viewBox="0 0 800 480" className="w-full" style={{ minHeight: 400 }}>
        {/* Background */}
        <rect width="800" height="480" fill="#09090b" />

        {/* Floor grid */}
        <IsoGrid />

        {/* Rooms */}
        {(Object.keys(ROOMS) as (keyof typeof ROOMS)[]).map(key => (
          <Room key={key} roomKey={key} />
        ))}

        {/* Agents */}
        {agents.map(agent => {
          const room = STATUS_ROOM[agent.status]
          const roomAgents = agentsByRoom[room] || []
          const index = roomAgents.findIndex(a => a.id === agent.id)
          const pos = getAgentPos(room, index, roomAgents.length)
          return <AgentSprite key={agent.id} agent={agent} x={pos.x} y={pos.y} />
        })}

        {/* Title */}
        <text x={400} y={25} fill="#fafafa" fontSize={14} textAnchor="middle" fontWeight="bold" letterSpacing={2}>
          🍌 THE LAB
        </text>
      </svg>
    </div>
  )
}

export function IsometricOfficeWrapper() {
  return <IsometricOffice agents={mockAgents} />
}
