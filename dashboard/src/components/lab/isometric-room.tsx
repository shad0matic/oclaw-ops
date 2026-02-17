
import React from 'react';

interface Room {
  id: string;
  name: string;
  position: { x: number; y: number };
}

interface IsometricRoomProps {
  room: Room;
}

const IsometricRoom: React.FC<IsometricRoomProps> = ({ room }) => {
  const ROOM_WIDTH = 256;
  const ROOM_HEIGHT = 128;

  const top = (room.position.x - room.position.y) * (ROOM_HEIGHT / 2);
  const left = (room.position.x + room.position.y) * (ROOM_WIDTH / 2);

  return (
    <div
      className="absolute"
      style={{
        transform: `translate(${left}px, ${top}px)`,
        width: `${ROOM_WIDTH}px`,
        height: `${ROOM_HEIGHT}px`,
      }}
    >
      <img
        src={`/assets/isometric/lounge/${room.id}.png`}
        alt={room.name}
        className="absolute w-full h-full"
      />
      <div className="absolute bottom-0 w-full text-center text-white bg-black bg-opacity-50 text-xs py-1">
        {room.name}
      </div>
    </div>
  );
};

export default IsometricRoom;
