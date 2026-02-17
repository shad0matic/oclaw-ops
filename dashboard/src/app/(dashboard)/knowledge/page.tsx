
'use client';

import React, { useState } from 'react';
import FolderTree from '~/components/bookmarks/folder-tree';
import BookmarkList from '~/components/bookmarks/bookmark-list';
import UnassignedBookmarks from '~/components/bookmarks/unassigned-bookmarks';

const KnowledgePage = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<bigint | null>(null);

  // This is a placeholder for the folder selection logic.
  // In a real implementation, the FolderTree component would have a callback to set the selected folder.
  // For now, I'll just hardcode a folder ID for demonstration purposes.
  const handleFolderSelect = (folderId: bigint) => {
    setSelectedFolderId(folderId);
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Knowledge Base</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <FolderTree onSelectFolder={handleFolderSelect} />
        </div>
        <div className="md:col-span-2 space-y-4">
          <BookmarkList folderId={selectedFolderId} />
          <UnassignedBookmarks />
        </div>
      </div>
    </div>
  );
};

export default KnowledgePage;
