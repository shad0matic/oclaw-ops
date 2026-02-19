"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import useSWR from 'swr'
import { motion, useAnimation, AnimatePresence } from 'framer-motion'
import { IsometricDetailedView } from './isometric-detailed'

// --- Types ---
type AgentStatus = 'idle' | 'active' | 'zombie' | 'dead'

interface Agent {
  id: string
  name: string
  status: AgentStatus
  currentTask?: string
  trustScore?: number
}

type AgentRegistryItem = {
  id: string
  name: string
  status: 'active' | 'idle' | 'zombie'
  currentTask?: string
  level?: number
  trustScore?: number
  avatarUrl?: string
}

interface AgentPosition {
  x: number
  y: number
  room: keyof typeof ROOMS
}

interface AgentAnimState {
  isMoving: boolean
  facingRight: boolean
  prevPosition: AgentPosition
  targetPosition: AgentPosition
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function getAvatarUrl(agentId: string): string {
  return `/assets/minion-avatars/${agentId}.webp`
}

// --- Room definitions (isometric diamond shapes) ---
const ROOMS = {
  lounge: { cx: 150, cy: 380, w: 200, h: 120, label: '🛋️ Idle Lounge', color: '#3f3f46' },
  active: { cx: 400, cy: 250, w: 280, h: 160, label: '💻 Active Room', color: '#854d0e' },
  warRoom: { cx: 650, cy: 120, w: 180, h: 110, label: '⚔️ War Room', color: '#991b1b' },
  graveyard: { cx: 650, cy: 400, w: 120, h: 80, label: '🪦 Graveyard', color: '#27272a' },
}

function getRoomForAgent(agent: Agent): keyof typeof ROOMS {
  if (typeof agent.trustScore === 'number' && agent.trustScore < 0.3) return 'warRoom'

  switch (agent.status) {
    case 'active':
      return 'active'
    case 'idle':
      return 'lounge'
    case 'zombie':
    case 'dead':
    default:
      return 'graveyard'
  }
}

// Isometric diamond path from center point
function diamondPath(cx: number, cy: number, w: number, h: number) {
  return `M ${cx} ${cy - h / 2} L ${cx + w / 2} ${cy} L ${cx} ${cy + h / 2} L ${cx - w / 2} ${cy} Z`
}

// Position agents within a room, spread evenly
function getAgentPos(roomKey: keyof typeof ROOMS, index: number, total: number): { x: number; y: number } {
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
      <text x={r.cx} y={r.cy - r.h / 2 + 18} fill="#a1a1aa" fontSize={11} textAnchor="middle" fontWeight="bold">
        {r.label}
      </text>
    </g>
  )
}

// --- Walking Avatar Component ---
function WalkingAvatar({ agent, avatarUrl, avatarSize, isMoving, facingRight }: { agent: Agent, avatarUrl: string, avatarSize: number, isMoving: boolean, facingRight: boolean }) {
  const walkSpriteUrl = avatarUrl.replace('.webp', '_walk.webp').replace('minion-avatars', 'isometric/characters/minions');

  return (
    <g>
      <style>{`
        .walker-${agent.id} {
          width: ${avatarSize}px;
          height: ${avatarSize}px;
          background-image: url(${walkSpriteUrl});
          background-size: ${avatarSize * 2}px ${avatarSize}px;
          animation: walk-anim-${agent.id} 0.4s steps(2) infinite;
        }
        @keyframes walk-anim-${agent.id} {
          from { background-position: 0 0; }
          to { background-position: -${avatarSize * 2}px 0; }
        }
      `}</style>
      <foreignObject x={-avatarSize / 2} y={-avatarSize / 2} width={avatarSize} height={avatarSize} clipPath={`url(#avatar-clip-${agent.id})`}>
        <div className={`walker-${agent.id}`} />
      </foreignObject>
    </g>
  );
}

// --- Animated Agent Sprite with Avatar ---
function AnimatedAgentSprite({
  agent,
  position,
  animState,
  onAnimationComplete,
}: {
  agent: Agent
  position: AgentPosition
  animState: AgentAnimState
  onAnimationComplete: () => void
}) {
  const isZombie = agent.status === 'zombie'
  const isActive = agent.status === 'active'
  const { isMoving, facingRight } = animState

  const avatarUrl = getAvatarUrl(agent.id)
  const avatarSize = 40

  return (
    <motion.g
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      transition={{
        duration: 1.8,
        ease: [0.34, 1.56, 0.64, 1], // Custom spring-like easing
      }}
      onAnimationComplete={onAnimationComplete}
    >
      {/* Shadow under avatar */}
      <motion.ellipse
        cx={0}
        cy={18}
        rx={16}
        ry={6}
        fill="#000000"
        opacity={0.3}
        animate={isMoving ? { rx: [16, 14, 16], opacity: [0.3, 0.2, 0.3] } : {}}
        transition={isMoving ? { repeat: Infinity, duration: 0.3 } : {}}
      />

      {/* Glow for active agents */}
      {isActive && !isMoving && (
        <motion.circle
          cx={0}
          cy={0}
          r={26}
          fill="#eab308"
          initial={{ fillOpacity: 0.1 }}
          animate={{ fillOpacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Zombie alarm flash */}
      {isZombie && (
        <motion.circle
          cx={20}
          cy={-20}
          r={5}
          fill="#ef4444"
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}

      {/* Dust puff when arriving */}
      <AnimatePresence>
        {!isMoving && animState.prevPosition.room !== animState.targetPosition.room && (
          <>
            {[...Array(3)].map((_, i) => (
              <motion.circle
                key={`dust-${i}`}
                cx={-10 + i * 10}
                cy={15}
                r={3}
                fill="#71717a"
                initial={{ opacity: 0.6, scale: 0.3, y: 0 }}
                animate={{ opacity: 0, scale: 1, y: -8 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Avatar container with walk animation */}
      <motion.g
        animate={
          isMoving
            ? {
                y: [0, -6, 0, -6, 0],
                x: [0, -2, 0, 2, 0],
              }
            : {
                // Subtle idle breathing
                y: [0, -1, 0],
              }
        }
        transition={
          isMoving
            ? { duration: 0.4, repeat: Infinity }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {/* Avatar image - rounded */}
        <motion.g
          style={{
            transformOrigin: '0 0',
          }}
          animate={{
            scaleX: facingRight ? 1 : -1,
          }}
          transition={{ duration: 0.2 }}
        >
          <defs>
            <clipPath id={`avatar-clip-${agent.id}`}>
              <circle cx={0} cy={0} r={avatarSize / 2} />
            </clipPath>
          </defs>
          <circle cx={0} cy={0} r={avatarSize / 2 + 2} fill="#27272a" /> {/* Border */}
          
          {isMoving ? (
            <WalkingAvatar agent={agent} avatarUrl={avatarUrl} avatarSize={avatarSize} isMoving={isMoving} facingRight={facingRight} />
          ) : (
            <image
              href={avatarUrl}
              x={-avatarSize / 2}
              y={-avatarSize / 2}
              width={avatarSize}
              height={avatarSize}
              clipPath={`url(#avatar-clip-${agent.id})`}
              style={{
                filter: isZombie ? 'saturate(0.3) brightness(0.6)' : 'none',
              }}
              preserveAspectRatio="xMidYMid slice"
            />
          )}
        </motion.g>

        {/* Zombie overlay */}
        {isZombie && (
          <text x={14} y={-12} fontSize={14} textAnchor="middle" dominantBaseline="central">
            🧟
          </text>
        )}
      </motion.g>

      {/* Name label */}
      <text x={0} y={28} fill="#d4d4d8" fontSize={9} textAnchor="middle" fontWeight="500">
        {agent.name}
      </text>

      {/* Current task (only show when not moving) */}
      {agent.currentTask && !isMoving && (
        <motion.text
          x={0}
          y={39}
          fill="#71717a"
          fontSize={7}
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {agent.currentTask.length > 25 ? agent.currentTask.slice(0, 25) + '…' : agent.currentTask}
        </motion.text>
      )}

      {/* Working indicator when active and not moving */}
      {isActive && !isMoving && (
        <motion.g
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.text
            x={24}
            y={-16}
            fontSize={12}
            animate={{ y: [-16, -18, -16] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ⚡
          </motion.text>
        </motion.g>
      )}
    </motion.g>
  )
}

// --- Grid lines (isometric floor) ---
function IsoGrid() {
  const lines = []
  for (let i = 0; i < 10; i++) {
    const y = 50 + i * 45
    lines.push(<line key={`h${i}`} x1={50} y1={y} x2={750} y2={y} stroke="#27272a" strokeWidth={0.5} />)
  }
  for (let i = 0; i < 12; i++) {
    const x = 50 + i * 65
    lines.push(<line key={`v${i}`} x1={x} y1={50} x2={x} y2={460} stroke="#27272a" strokeWidth={0.5} />)
  }
  return <g opacity={0.4}>{lines}</g>
}

function IsometricOfficeSkeleton() {
  return (
    <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="relative w-full" style={{ minHeight: 400 }}>
        <div className="absolute inset-0 bg-zinc-950" />
        <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
          <div className="shimmer" />
        </div>
      </div>
      <style jsx>{`
        .shimmer {
          width: 200%;
          height: 100%;
          background: linear-gradient(90deg, rgba(24, 24, 27, 0) 0%, rgba(63, 63, 70, 0.35) 50%, rgba(24, 24, 27, 0) 100%);
          transform: translateX(-50%);
          animation: shimmer 1.25s infinite;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-60%);
          }
          100% {
            transform: translateX(10%);
          }
        }
      `}</style>
    </div>
  )
}

// --- Main Component with Animation State Management ---
export function IsometricOffice({ agents }: { agents: Agent[] }) {
  // Track previous agent states for detecting changes
  const prevAgentsRef = useRef<Map<string, Agent>>(new Map())
  const [animStates, setAnimStates] = useState<Map<string, AgentAnimState>>(new Map())

  // Calculate positions for all agents grouped by room
  const getPositions = useCallback((agentList: Agent[]) => {
    const agentsByRoom: Record<string, Agent[]> = {}
    agentList.forEach((a) => {
      const room = getRoomForAgent(a)
      if (!agentsByRoom[room]) agentsByRoom[room] = []
      agentsByRoom[room].push(a)
    })

    const positions = new Map<string, AgentPosition>()
    agentList.forEach((agent) => {
      const room = getRoomForAgent(agent)
      const roomAgents = agentsByRoom[room] || []
      const index = roomAgents.findIndex((a) => a.id === agent.id)
      const pos = getAgentPos(room, index, roomAgents.length)
      positions.set(agent.id, { ...pos, room })
    })
    return positions
  }, [])

  // Update animation states when agents change
  useEffect(() => {
    const currentPositions = getPositions(agents)
    const newAnimStates = new Map<string, AgentAnimState>()

    agents.forEach((agent) => {
      const prevAgent = prevAgentsRef.current.get(agent.id)
      const currentPos = currentPositions.get(agent.id)!
      const prevAnimState = animStates.get(agent.id)

      // Determine if the agent has moved rooms
      const prevRoom = prevAgent ? getRoomForAgent(prevAgent) : currentPos.room
      const currentRoom = getRoomForAgent(agent)
      const hasMovedRooms = prevRoom !== currentRoom

      // Calculate facing direction based on movement
      let facingRight = prevAnimState?.facingRight ?? true
      if (hasMovedRooms && prevAnimState?.targetPosition) {
        facingRight = currentPos.x > prevAnimState.targetPosition.x
      }

      const prevPosition = prevAnimState?.targetPosition || currentPos

      newAnimStates.set(agent.id, {
        isMoving: hasMovedRooms,
        facingRight,
        prevPosition,
        targetPosition: currentPos,
      })
    })

    setAnimStates(newAnimStates)

    // Update prev agents ref
    const newPrevAgents = new Map<string, Agent>()
    agents.forEach((a) => newPrevAgents.set(a.id, a))
    prevAgentsRef.current = newPrevAgents
  }, [agents, getPositions])

  // Handler for when animation completes
  const handleAnimationComplete = useCallback((agentId: string) => {
    setAnimStates((prev) => {
      const newStates = new Map(prev)
      const state = newStates.get(agentId)
      if (state) {
        newStates.set(agentId, { ...state, isMoving: false })
      }
      return newStates
    })
  }, [])

  const currentPositions = getPositions(agents)

  return (
    <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      <svg viewBox="0 0 800 480" className="w-full" style={{ minHeight: 400 }}>
        {/* Background */}
        <rect width="800" height="480" fill="#09090b" />

        {/* Floor grid */}
        <IsoGrid />

        {/* Rooms */}
        {(Object.keys(ROOMS) as (keyof typeof ROOMS)[]).map((key) => (
          <Room key={key} roomKey={key} />
        ))}

        {/* Agents */}
        {agents.map((agent) => {
          const position = currentPositions.get(agent.id)!
          const animState = animStates.get(agent.id) || {
            isMoving: false,
            facingRight: true,
            prevPosition: position,
            targetPosition: position,
          }

          return (
            <AnimatedAgentSprite
              key={agent.id}
              agent={agent}
              position={position}
              animState={animState}
              onAnimationComplete={() => handleAnimationComplete(agent.id)}
            />
          )
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
  const { data, error, isLoading } = useSWR<AgentRegistryItem[]>('/api/agents/registry', fetcher, {
    refreshInterval: 10000,
  })
  
  // Debug state for testing walk animations
  const [debugOverrides, setDebugOverrides] = useState<Record<string, AgentStatus>>({})
  const [showDebugPanel, setShowDebugPanel] = useState(false)
  const [viewMode, setViewMode] = useState<'basic' | 'detailed'>('basic')

  if (isLoading && !data) return <IsometricOfficeSkeleton />

  if (error) {
    return (
      <div className="w-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden" style={{ minHeight: 400 }}>
        <div className="p-4 text-sm text-red-400">Failed to load agents.</div>
      </div>
    )
  }

  const agents: Agent[] = (data || []).map((a) => ({
    id: a.id,
    name: a.name,
    status: debugOverrides[a.id] || a.status,
    currentTask: a.currentTask,
    trustScore: a.trustScore,
  }))

  const sendBobToWork = () => {
    setDebugOverrides(prev => ({ ...prev, bob: 'active' }))
  }

  const sendBobToLounge = () => {
    setDebugOverrides(prev => ({ ...prev, bob: 'idle' }))
  }

  const resetDebug = () => {
    setDebugOverrides({})
  }

  return (
    <div className="space-y-3">
      {/* View Mode & Debug Toggle Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">View:</span>
          <button
            onClick={() => setViewMode('basic')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === 'basic' 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Basic
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              viewMode === 'detailed' 
                ? 'bg-amber-500/20 text-amber-400' 
                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
            }`}
          >
            Detailed ✨
          </button>
        </div>
        <button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className={`px-3 py-1.5 text-xs rounded transition-colors ${
            showDebugPanel 
              ? 'bg-purple-500/20 text-purple-400' 
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          🧪 Debug {showDebugPanel ? 'ON' : 'OFF'}
        </button>
      </div>

      {/* The Office View */}
      {viewMode === 'basic' ? (
        <IsometricOffice agents={agents} />
      ) : (
        <IsometricDetailedView agents={agents} />
      )}
      
      {/* Debug Controls (toggleable) */}
      {showDebugPanel && (
        <div className="flex items-center gap-2 p-3 bg-zinc-900/50 rounded-lg border border-purple-500/30">
          <span className="text-xs text-purple-400 mr-2">🧪 Debug:</span>
          <button
            onClick={sendBobToWork}
            className="px-3 py-1.5 text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded transition-colors"
          >
            Bob → Work 💻
          </button>
          <button
            onClick={sendBobToLounge}
            className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded transition-colors"
          >
            Bob → Lounge 🛋️
          </button>
          <button
            onClick={resetDebug}
            className="px-3 py-1.5 text-xs bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30 rounded transition-colors"
          >
            Reset
          </button>
          {Object.keys(debugOverrides).length > 0 && (
            <span className="text-xs text-amber-400/60 ml-2">
              (overrides active)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
