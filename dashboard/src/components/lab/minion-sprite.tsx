'use client';

import React, { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  room: string;
  direction: string;
}

interface MinionSpriteProps {
  agent: Agent;
  roomPosition: { x: number; y: number };
}

const directionToAngle: { [key: string]: number } = {
  n: 0,
  ne: 45,
  e: 90,
  se: 135,
  s: 180,
  sw: 225,
  w: 270,
  nw: 315,
};

const MinionSprite: React.FC<MinionSpriteProps> = ({ agent, roomPosition }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ROOM_WIDTH = 256;
  const ROOM_HEIGHT = 128;

  useEffect(() => {
    const top = (roomPosition.x - roomPosition.y) * (ROOM_HEIGHT / 2);
    const left = (roomPosition.x + roomPosition.y) * (ROOM_WIDTH / 2);
    setPosition({ x: left + ROOM_WIDTH / 2 - 32, y: top + ROOM_HEIGHT / 2 - 32 });
  }, [roomPosition]);

  const getSpriteDirection = (angle: number) => {
    const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'];
    const index = Math.round(angle / 45) % 8;
    return directions[index];
  };

  const angle = directionToAngle[agent.direction] || 0;
  const spriteDirection = getSpriteDirection(angle);

  const handleClick = () => {
    alert(`Agent: ${agent.name}\nRoom: ${agent.room}\nDirection: ${agent.direction}`);
  };

  return (
    <div
      className="absolute transition-transform duration-1000 ease-in-out group cursor-pointer"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      onClick={handleClick}
    >
      <img
        src={`/assets/minions/${agent.id}/${spriteDirection}.webp`}
        alt={agent.name}
        className="w-16 h-16"
      />
      <div className="absolute -top-4 w-full text-center text-xs text-white bg-black bg-opacity-50 rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {agent.name}
      </div>
    </div>
  );
};

export default MinionSprite;
