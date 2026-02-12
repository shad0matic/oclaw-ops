"use client"

import React, { useState } from 'react';
import { motion } from 'framer-motion';

// --- Types ---
type AgentStatus = 'idle' | 'active' | 'zombie' | 'dead';

interface SubSpawn {
  id: string;
  name: string;
  status: AgentStatus;
}

interface Agent {
  id: string;
  name: string;
  emoji: string;
  status: AgentStatus;
  currentTask?: string;
  subSpawns?: SubSpawn[];
}

interface IsometricOfficeProps {
  agents: Agent[];
}

// --- Mock Data ---
const mockAgents: Agent[] = [
  { id: 'kevin', name: 'Kevin', emoji: '🍌', status: 'active', currentTask: 'Planning feature pack', subSpawns: [
    { id: 'sub-1', name: 'Cost Audit', status: 'active' }
  ]},
  { id: 'nefario', name: 'Dr. Nefario', emoji: '🔬', status: 'active', currentTask: 'Researching cost estimation' },
  { id: 'bob', name: 'Bob', emoji: '🎨', status: 'idle' },
  { id: 'xreader', name: 'X Reader', emoji: '📰', status: 'zombie' },
];

// --- Helper Functions ---
const getAgentPosition = (agent: Agent, index: number, totalAgentsInStatus: number) => {
  const stagger = (index / (totalAgentsInStatus || 1)) * 50 + 25; // %
  switch (agent.status) {
    case 'idle':
      return { x: 15, y: 80, cx: `${stagger}%`, cy: '50%' };
    case 'active':
      return { x: 55, y: 50, cx: `${stagger}%`, cy: '50%' };
    case 'zombie':
      return { x: 85, y: 20, cx: `${stagger}%`, cy: '50%' };
    case 'dead':
      return { x: 85, y: 85, cx: `${stagger}%`, cy: '50%' };
    default:
      return { x: 50, y: 50, cx: '50%', cy: '50%' };
  }
};

// --- Sub-Components ---
const OfficeRoom: React.FC<{ id: string; label: string; x: string; y: string; width: string; height: string; color: string }> = 
  ({ id, label, x, y, width, height, color }) => (
  <g id={id}>
    <rect x={x} y={y} width={width} height={height} fill={`rgba(${color}, 0.1)`} stroke={`rgb(${color})`} strokeWidth="1" />
    <text x={`calc(${x} + ${width} / 2)`} y={`calc(${y} + 20)`} fill={`rgb(${color})`} fontSize="12" textAnchor="middle" >
      {label}
    </text>
  </g>
);

const AgentIcon: React.FC<{ agent: Agent; x: string; y: string }> = ({ agent, x, y }) => {
    const glowing = agent.status === 'active';
    const isZombie = agent.status === 'zombie';

    return (
        <g transform={`translate(${x}, ${y})`}>
            {glowing && <circle cx="15" cy="15" r="15" fill="yellow" opacity="0.3" />}
            <text x="15" y="15" fontSize="24" textAnchor="middle" dominantBaseline="central"
                style={{
                    filter: isZombie ? 'grayscale(100%) brightness(50%) sepia(100%) hue-rotate(50deg)' : 'none',
                    transition: 'all 0.3s ease',
                }}>
                {agent.emoji}
            </text>
             {isZombie && <text x="15" y="15" fontSize="18" textAnchor="middle" dominantBaseline="central">🧟</text>}
        </g>
    );
};


// --- Main Component ---
const IsometricOffice: React.FC<IsometricOfficeProps> = ({ agents }) => {
  const agentsByStatus = {
    idle: agents.filter(a => a.status === 'idle'),
    active: agents.filter(a => a.status === 'active'),
    zombie: agents.filter(a => a.status === 'zombie'),
    dead: agents.filter(a => a.status === 'dead'),
  };

  return (
    <div className="w-full h-[500px] bg-zinc-900 rounded-lg border border-zinc-700 p-4 flex items-center justify-center overflow-hidden">
      <svg width="100%" height="100%" viewBox="0 0 400 300" style={{ transform: 'rotateX(55deg) rotateZ(-45deg)', transformStyle: 'preserve-3d' }}>
        <defs>
            <filter id="glow">
                <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                </feMerge>
            </filter>
        </defs>

        {/* --- Rooms --- */}
        <OfficeRoom id="idle-lounge" label="🛋️ Idle Lounge" x="5%" y="65%" width="35%" height="30%" color="74, 74, 74" />
        <OfficeRoom id="active-room" label="💻 Active Room" x="35%" y="25%" width="50%" height="50%" color="140, 110, 38" />
        <OfficeRoom id="war-room" label="⚔️ War Room" x="65%" y="5%" width="30%" height="25%" color="160, 68, 68" />
        <OfficeRoom id="graveyard" label="🪦 Graveyard" x="80%" y="75%" width="15%" height="20%" color="51, 51, 51" />

        {/* --- Agents --- */}
        {agents.map((agent) => {
            const statusAgents = agentsByStatus[agent.status];
            const index = statusAgents.findIndex(a => a.id === agent.id);
            const { x, y } = getAgentPosition(agent, index, statusAgents.length);

            return (
                 <motion.g
                    key={agent.id}
                    initial={{ x: `${x}%`, y: `${y}%` }}
                    animate={{ x: `${x}%`, y: `${y}%` }}
                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                >
                    <AgentIcon agent={agent} x="0" y="0" />
                </motion.g>
            );
        })}
      </svg>
    </div>
  );
};

export const IsometricOfficeWrapper: React.FC = () => {
    return <IsometricOffice agents={mockAgents} />;
}
