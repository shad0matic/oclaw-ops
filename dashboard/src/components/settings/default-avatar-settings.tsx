
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

const mockAvatars = ['kevin.webp', 'bob.webp', 'stuart.webp', 'nefario.webp', 'default.webp'];

export function DefaultAvatarSettings() {
  const [defaultAvatar, setDefaultAvatar] = useState('default.webp');
  const [avatars, setAvatars] = useState(mockAvatars);

  // In a real app, you would fetch the current default avatar and the library
  // useEffect(() => {
  //   // fetch('/api/settings/default-avatar').then(res => res.json()).then(data => setDefaultAvatar(data.avatar));
  //   // fetch('/api/avatars/library').then(res => res.json()).then(setAvatars);
  // }, []);

  const handleSave = () => {
    // API call to save the new default avatar
    // fetch('/api/settings/default-avatar', {
    //   method: 'POST',
    //   body: JSON.stringify({ avatar: defaultAvatar }),
    // });
    console.log('Saved default avatar:', defaultAvatar);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Default Avatar Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose a default avatar for agents without a specific one assigned.
        </p>
        <Select value={defaultAvatar} onValueChange={setDefaultAvatar}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a default avatar" />
          </SelectTrigger>
          <SelectContent>
            {avatars.map((avatar) => (
              <SelectItem key={avatar} value={avatar}>
                {avatar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSave}>Save Default</Button>
      </CardContent>
    </Card>
  );
}
