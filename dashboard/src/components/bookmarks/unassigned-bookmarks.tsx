
'use client';

import React, { useState, useEffect } from 'react';
import AutoCategorizeModal from './auto-categorize-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Bookmark {
  id: string;
  url: string;
  text: string;
  author_name: string;
  author_handle: string;
  created_at: string;
}

interface Folder {
  id: bigint;
  name: string;
}

const UnassignedBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<bigint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // This is a simplified approach. In a real app, you'd fetch only unassigned bookmarks.
    // For now, we fetch all and assume the user knows which are unassigned.
    fetch('/api/bookmarks')
      .then(res => res.json())
      .then(data => setBookmarks(data.bookmarks || []));

    fetch('/api/bookmark-folders')
      .then(res => res.json())
      .then(data => setFolders(Array.isArray(data) ? data : []));
  }, []);

  const handleAssignBookmark = async (bookmarkId: string) => {
    if (selectedFolder) {
      await fetch('/api/bookmark-folder-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: selectedFolder, bookmarkId }),
      });
      // Optionally, remove the bookmark from this list after assignment
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unassigned Bookmarks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-4">
          <Select onValueChange={(value) => setSelectedFolder(BigInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Select a folder" />
            </SelectTrigger>
            <SelectContent>
              {folders.map(folder => (
                <SelectItem key={folder.id.toString()} value={folder.id.toString()}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsModalOpen(true)} 
            disabled={bookmarks.length === 0}
          >
            Auto-Categorize ({bookmarks.length})
          </Button>
        </div>
        <ul className="space-y-2">
          {bookmarks.map(bookmark => (
            <li key={bookmark.id} className="border p-2 rounded flex justify-between items-center">
              <div>
                <p>{bookmark.text}</p>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">{bookmark.url}</a>
              </div>
              <Button size="sm" onClick={() => handleAssignBookmark(bookmark.id)} disabled={!selectedFolder}>
                Assign
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
    <AutoCategorizeModal 
      open={isModalOpen} 
      onOpenChange={setIsModalOpen} 
      uncategorizedCount={bookmarks.length} 
      selectedBookmarkIds={[]} 
      onApply={() => { /* Refresh bookmarks after apply */ fetch('/api/bookmarks').then(res => res.json()).then(data => setBookmarks(data.bookmarks || [])); }}
    />
  );
};

export default UnassignedBookmarks;
