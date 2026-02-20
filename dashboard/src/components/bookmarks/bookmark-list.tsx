
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Bookmark {
  id: string;
  url: string;
  text: string;
  author_name: string;
  author_handle: string;
  created_at: string;
}

interface BookmarkListProps {
  folderId: bigint | null;
}

const BookmarkList = ({ folderId }: BookmarkListProps) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [selectedBookmarks, setSelectedBookmarks] = useState<string[]>([]);
  const [targetFolderId, setTargetFolderId] = useState<bigint | null>(null);

  useEffect(() => {
    if (folderId) {
      fetch(`/api/bookmark-folder-items?folderId=${folderId}`)
        .then(res => res.json())
        .then(async (items) => {
            const itemsArray = Array.isArray(items) ? items : [];
            const bookmarkIds = itemsArray.map((item: any) => item.bookmarkId);
            if(bookmarkIds.length > 0) {
                const bookmarksRes = await fetch(`/api/bookmarks?ids=${bookmarkIds.join(',')}`);
                const bookmarksData = await bookmarksRes.json();
                setBookmarks(bookmarksData.bookmarks || []);
            } else {
                setBookmarks([]);
            }
        });
    } else {
      setBookmarks([]);
    }
  }, [folderId]);

  const handleRemoveBookmark = async (bookmarkId: string) => {
    if (folderId) {
      await fetch('/api/bookmark-folder-items', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId, bookmarkId }),
      });
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
    }
  };

  const handleSelectBookmark = (bookmarkId: string) => {
    setSelectedBookmarks(prev => 
      prev.includes(bookmarkId) 
        ? prev.filter(id => id !== bookmarkId) 
        : [...prev, bookmarkId]
    );
  };

  const handleBulkDelete = async () => {
    if (folderId && selectedBookmarks.length > 0) {
      for (const bookmarkId of selectedBookmarks) {
        await fetch('/api/bookmark-folder-items', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId, bookmarkId }),
        });
      }
      setBookmarks(bookmarks.filter(b => !selectedBookmarks.includes(b.id)));
      setSelectedBookmarks([]);
    }
  };

  const handleBulkMove = async () => {
    if (folderId && targetFolderId && selectedBookmarks.length > 0) {
      for (const bookmarkId of selectedBookmarks) {
        await fetch('/api/bookmark-folder-items', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldFolderId: folderId, newFolderId: targetFolderId, bookmarkId }),
        });
      }
      setBookmarks(bookmarks.filter(b => !selectedBookmarks.includes(b.id)));
      setSelectedBookmarks([]);
      setTargetFolderId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookmarks</CardTitle>
      </CardHeader>
      <CardContent>
        {bookmarks.length === 0 ? (
          <p>Select a folder to see bookmarks.</p>
        ) : (
          <div>
            <div className="mb-4 flex space-x-2">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleBulkDelete} 
                disabled={selectedBookmarks.length === 0}
              >
                Bulk Delete ({selectedBookmarks.length})
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBulkMove} 
                disabled={selectedBookmarks.length === 0 || !targetFolderId}
              >
                Bulk Move to Folder
              </Button>
              <select 
                className="border rounded p-1"
                value={targetFolderId?.toString() || ''} 
                onChange={e => setTargetFolderId(e.target.value ? BigInt(e.target.value) : null)}
              >
                <option value="">Select Target Folder</option>
                {/* Placeholder: Ideally, fetch and list folders dynamically here */}
                <option value="1">Folder 1</option>
                <option value="2">Folder 2</option>
              </select>
            </div>
            <ul className="space-y-2">
              {bookmarks.map(bookmark => (
                <li 
                  key={bookmark.id} 
                  className={`border p-2 rounded ${selectedBookmarks.includes(bookmark.id) ? 'bg-blue-100' : ''}`}
                  onClick={() => handleSelectBookmark(bookmark.id)}
                >
                  <p>{bookmark.text}</p>
                  <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">{bookmark.url}</a>
                  <p>by {bookmark.author_name} (@{bookmark.author_handle})</p>
                  <Button variant="destructive" size="sm" onClick={(e) => { e.stopPropagation(); handleRemoveBookmark(bookmark.id); }}>Remove</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BookmarkList;
