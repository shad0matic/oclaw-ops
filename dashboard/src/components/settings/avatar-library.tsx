
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

const mockAvatars = [
  { name: 'kevin.webp', size: '25KB', assignedTo: 'Kevin' },
  { name: 'bob.webp', size: '22KB', assignedTo: 'Bob' },
  { name: 'stuart.webp', size: '28KB', assignedTo: 'Stuart' },
  { name: 'nefario.webp', size: '35KB', assignedTo: null },
  { name: 'default.webp', size: '15KB', assignedTo: 'Default' },
];

export function AvatarLibrary() {
  const [avatars, setAvatars] = useState(mockAvatars);

  // Fetch avatar library from API
  // useEffect(() => {
  //   fetch('/api/avatars/library').then(res => res.json()).then(setAvatars);
  // }, []);

  const handleDelete = (avatarName) => {
    // Prevent deletion if assigned
    const avatar = avatars.find(a => a.name === avatarName);
    if (avatar && avatar.assignedTo) {
      alert(`${avatarName} is currently assigned to ${avatar.assignedTo} and cannot be deleted.`);
      return;
    }
    
    if (confirm(`Are you sure you want to delete ${avatarName}?`)) {
      setAvatars(avatars.filter(a => a.name !== avatarName));
      // API call to delete the avatar
      // fetch(`/api/avatars/${avatarName}`, { method: 'DELETE' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Images Library</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {avatars.map((avatar) => (
            <div key={avatar.name} className="relative group">
              <Image
                src={`/assets/minion-avatars/${avatar.name}`}
                alt={avatar.name}
                width={100}
                height={100}
                className="rounded-md object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1 text-xs rounded-b-md">
                <p className="truncate">{avatar.name}</p>
                <p>{avatar.size}</p>
                {avatar.assignedTo && <p className="font-bold">In use</p>}
              </div>
              {!avatar.assignedTo && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(avatar.name)}
                >
                  X
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
