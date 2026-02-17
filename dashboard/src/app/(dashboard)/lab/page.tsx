
import IsometricRoom from '@/components/lab/isometric-room';
import MinionSprite from '@/components/lab/minion-sprite';

const LabPage = () => {
  // Mock data for now, will be replaced with API data
  const agents = [
    { id: 'bob', name: 'Bob', room: 'coding', direction: 's' },
    { id: 'stuart', name: 'Stuart', room: 'lounge', direction: 'ne' },
    { id: 'kevin', name: 'Kevin', room: 'kitchen', direction: 'w' },
  ];

  const rooms = [
    { id: 'coding', name: 'Coding Room', position: { x: 0, y: 0 } },
    { id: 'lounge', name: 'Lounge', position: { x: 1, y: 0 } },
    { id: 'kitchen', name: 'Kitchen', position: { x: 0, y: 1 } },
    { id: 'games', name: 'Games Room', position: { x: 1, y: 1 } },
  ];

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <div className="isometric-grid absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {rooms.map((room) => (
          <IsometricRoom key={room.id} room={room} />
        ))}
        {agents.map((agent) => {
          const room = rooms.find((r) => r.id === agent.room);
          if (!room) return null;
          return <MinionSprite key={agent.id} agent={agent} roomPosition={room.position} />;
        })}
      </div>
    </div>
  );
};

export default LabPage;
