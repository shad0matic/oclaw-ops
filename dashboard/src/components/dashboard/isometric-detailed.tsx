"use client"

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { AgentEntity } from '@/entities/agent'

// --- Types ---
type AgentStatus = 'idle' | 'active' | 'zombie' | 'dead'

interface Agent {
  id: string
  name: string
  status: AgentStatus
  currentTask?: string
  trustScore?: number
}

// Room definitions with positions and assigned agents
const DETAILED_ROOMS = {
  // Agent workspaces
  'nefario-lab': { 
    x: 50, y: 50, width: 400, height: 350,
    image: '/assets/isometric/rooms/nefario-lab.png',
    label: "🧪 Nefario's Lab",
    assignedAgent: 'nefario'
  },
  'echo-studio': { 
    x: 470, y: 50, width: 380, height: 320,
    image: '/assets/isometric/rooms/echo-studio.png',
    label: "🎙️ Echo's Studio",
    assignedAgent: 'echo'
  },
  'mel-police': { 
    x: 870, y: 50, width: 350, height: 320,
    image: '/assets/isometric/rooms/mel-police.png',
    label: "🚔 Mel's Station",
    assignedAgent: 'mel'
  },
  'bob-coding': { 
    x: 50, y: 420, width: 400, height: 350,
    image: '/assets/isometric/rooms/bob-coding.png',
    label: "💻 Bob's Corner",
    assignedAgent: 'bob'
  },
  // Lounge areas
  'lounge-seating': { 
    x: 470, y: 390, width: 360, height: 300,
    image: '/assets/isometric/lounge/seating.png',
    label: "🛋️ Lounge",
    assignedAgent: null
  },
  'lounge-games': { 
    x: 850, y: 390, width: 370, height: 300,
    image: '/assets/isometric/lounge/games.png',
    label: "🎱 Games",
    assignedAgent: null
  },
} as const

type RoomKey = keyof typeof DETAILED_ROOMS

// Map agent status to room
function getRoomForAgent(agent: Agent): RoomKey {
  // If agent has an assigned workspace and is active, go there
  const assignedRoom = Object.entries(DETAILED_ROOMS).find(
    ([_, room]) => room.assignedAgent === agent.id
  )
  
  if (agent.status === 'active' && assignedRoom) {
    return assignedRoom[0] as RoomKey
  }
  
  // Idle agents go to lounge
  if (agent.status === 'idle') {
    return 'lounge-seating'
  }
  
  // Zombie/dead go to lounge games (chilling/broken)
  return 'lounge-games'
}

// Get position within a room for an agent
function getAgentPosition(roomKey: RoomKey, index: number, total: number) {
  const room = DETAILED_ROOMS[roomKey]
  // Position agents in the lower-center of each room
  const baseX = room.x + room.width / 2
  const baseY = room.y + room.height * 0.7
  // Spread multiple agents
  const spread = Math.min(total, 4)
  const offsetX = (index - (spread - 1) / 2) * 60
  return { x: baseX + offsetX, y: baseY }
}

function getAvatarUrl(agentId: string): string {
  return AgentEntity.avatarUrl(agentId)
}

// --- Agent Sprite Component ---
function AgentSprite({
  agent,
  position,
  isMoving,
  onAnimationComplete,
}: {
  agent: Agent
  position: { x: number; y: number }
  isMoving: boolean
  onAnimationComplete: () => void
}) {
  const isActive = agent.status === 'active'
  const isZombie = agent.status === 'zombie'
  const avatarSize = 50

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{ 
        left: position.x - avatarSize / 2, 
        top: position.y - avatarSize / 2,
        zIndex: Math.floor(position.y)
      }}
      initial={false}
      animate={{ 
        left: position.x - avatarSize / 2, 
        top: position.y - avatarSize / 2 
      }}
      transition={{
        duration: 1.5,
        ease: [0.34, 1.56, 0.64, 1],
      }}
      onAnimationComplete={onAnimationComplete}
    >
      {/* Glow for active agents */}
      {isActive && !isMoving && (
        <motion.div
          className="absolute inset-0 rounded-full bg-amber-400"
          style={{ margin: -8 }}
          animate={{ opacity: [0.2, 0.4, 0.2], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      {/* Avatar with bounce animation when moving */}
      <motion.div
        animate={isMoving ? { y: [0, -8, 0] } : { y: [0, -2, 0] }}
        transition={isMoving 
          ? { duration: 0.3, repeat: Infinity }
          : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <div 
          className={`rounded-full border-2 overflow-hidden ${
            isActive ? 'border-amber-400' : isZombie ? 'border-red-500' : 'border-zinc-600'
          }`}
          style={{ width: avatarSize, height: avatarSize }}
        >
          <img
            src={getAvatarUrl(agent.id)}
            alt={agent.name}
            className="w-full h-full object-cover"
            style={{ filter: isZombie ? 'saturate(0.3) brightness(0.6)' : 'none' }}
            onError={(e) => { (e.target as HTMLImageElement).src = '/assets/minion-avatars/default.webp' }}
          />
        </div>
        
        {/* Zombie indicator */}
        {isZombie && (
          <motion.div
            className="absolute -top-1 -right-1 text-sm"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            🧟
          </motion.div>
        )}
        
        {/* Working indicator */}
        {isActive && !isMoving && (
          <motion.div
            className="absolute -top-2 -right-2 text-sm"
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ⚡
          </motion.div>
        )}
      </motion.div>
      
      {/* Name label */}
      <div className="text-center mt-1">
        <span className="text-xs text-white bg-black/50 px-1.5 py-0.5 rounded">
          {agent.name}
        </span>
      </div>
    </motion.div>
  )
}

// --- Main Detailed View Component ---
export function IsometricDetailedView({ agents }: { agents: Agent[] }) {
  const prevAgentsRef = useRef<Map<string, Agent>>(new Map())
  const [movingAgents, setMovingAgents] = useState<Set<string>>(new Set())

  // Calculate positions for all agents
  const getPositions = useCallback(() => {
    const agentsByRoom: Record<RoomKey, Agent[]> = {} as any
    
    agents.forEach((agent) => {
      const room = getRoomForAgent(agent)
      if (!agentsByRoom[room]) agentsByRoom[room] = []
      agentsByRoom[room].push(agent)
    })

    const positions = new Map<string, { x: number; y: number; room: RoomKey }>()
    agents.forEach((agent) => {
      const room = getRoomForAgent(agent)
      const roomAgents = agentsByRoom[room] || []
      const index = roomAgents.findIndex((a) => a.id === agent.id)
      const pos = getAgentPosition(room, index, roomAgents.length)
      positions.set(agent.id, { ...pos, room })
    })
    return positions
  }, [agents])

  // Detect room changes and trigger movement
  useEffect(() => {
    const newMoving = new Set<string>()
    
    agents.forEach((agent) => {
      const prevAgent = prevAgentsRef.current.get(agent.id)
      if (prevAgent) {
        const prevRoom = getRoomForAgent(prevAgent)
        const newRoom = getRoomForAgent(agent)
        if (prevRoom !== newRoom) {
          newMoving.add(agent.id)
        }
      }
    })
    
    if (newMoving.size > 0) {
      setMovingAgents(newMoving)
    }
    
    // Update prev ref
    const newPrev = new Map<string, Agent>()
    agents.forEach((a) => newPrev.set(a.id, a))
    prevAgentsRef.current = newPrev
  }, [agents])

  const handleAnimationComplete = useCallback((agentId: string) => {
    setMovingAgents((prev) => {
      const next = new Set(prev)
      next.delete(agentId)
      return next
    })
  }, [])

  const positions = getPositions()

  return (
    <div className="relative w-full bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Room images */}
      <div className="relative" style={{ height: 750 }}>
        {Object.entries(DETAILED_ROOMS).map(([key, room]) => (
          <div
            key={key}
            className="absolute transition-transform hover:scale-[1.02]"
            style={{
              left: room.x,
              top: room.y,
              width: room.width,
              height: room.height,
            }}
          >
            <img
              src={room.image}
              alt={room.label}
              className="w-full h-full object-contain drop-shadow-lg"
            />
            {/* Room label */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
              <span className="text-xs text-white/70 bg-black/40 px-2 py-1 rounded">
                {room.label}
              </span>
            </div>
          </div>
        ))}
        
        {/* Agent sprites */}
        {agents.map((agent) => {
          const pos = positions.get(agent.id)
          if (!pos) return null
          
          return (
            <AgentSprite
              key={agent.id}
              agent={agent}
              position={{ x: pos.x, y: pos.y }}
              isMoving={movingAgents.has(agent.id)}
              onAnimationComplete={() => handleAnimationComplete(agent.id)}
            />
          )
        })}
      </div>
      
      {/* Title */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <h2 className="text-lg font-bold text-white/90 tracking-wider">
          🍌 MINION HQ — DETAILED VIEW
        </h2>
      </div>
    </div>
  )
}
