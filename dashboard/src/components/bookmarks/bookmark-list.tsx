
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';

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

  useEffect(() => {
    if (folderId) {
      fetch(`/api/bookmark-folder-items?folderId=${folderId}`)
        .then(res => res.json())
        .then(async (items) => {
            const bookmarkIds = items.map((item: any) => item.bookmarkId);
            if(bookmarkIds.length > 0) {
                const bookmarksRes = await fetch(`/api/bookmarks?ids=${bookmarkIds.join(',')}`);
                const bookmarksData = await bookmarksRes.json();
                setBookmarks(bookmarksData);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookmarks</CardTitle>
      </CardHeader>
      <CardContent>
        {bookmarks.length === 0 ? (
          <p>Select a folder to see bookmarks.</p>
        ) : (
          <ul className="space-y-2">
            {bookmarks.map(bookmark => (
              <li key={bookmark.id} className="border p-2 rounded">
                <p>{bookmark.text}</p>
                <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">{bookmark.url}</a>
                <p>by {bookmark.author_name} (@{bookmark.author_handle})</p>
                <Button variant="destructive" size="sm" onClick={() => handleRemoveBookmark(bookmark.id)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default BookmarkList;
