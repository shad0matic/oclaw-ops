
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';

interface Folder {
  id: bigint;
  name: string;
  description: string | null;
  parentId: bigint | null;
  children?: Folder[];
}

interface FolderTreeProps {
  onSelectFolder: (id: bigint) => void;
}

const FolderTree = ({ onSelectFolder }: FolderTreeProps) => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  const fetchFolders = async () => {
    const response = await fetch('/api/bookmark-folders');
    const data = await response.json();
    const tree = buildTree(data);
    setFolders(tree);
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const buildTree = (folders: Folder[]): Folder[] => {
    const map: { [key: string]: Folder } = {};
    const roots: Folder[] = [];

    folders.forEach(folder => {
      map[folder.id.toString()] = { ...folder, children: [] };
    });

    folders.forEach(folder => {
      if (folder.parentId) {
        map[folder.parentId.toString()].children?.push(map[folder.id.toString()]);
      } else {
        roots.push(map[folder.id.toString()]);
      }
    });

    return roots;
  };

  const handleSaveFolder = async (folder: Omit<Folder, 'id' | 'children'> & { id?: bigint }) => {
    const method = folder.id ? 'PUT' : 'POST';
    const response = await fetch('/api/bookmark-folders', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folder),
    });
    if (response.ok) {
      fetchFolders();
      setEditingFolder(null);
    }
  };

  const handleDeleteFolder = async (id: bigint) => {
    if (confirm('Are you sure you want to delete this folder?')) {
      await fetch('/api/bookmark-folders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchFolders();
    }
  };

  const FolderForm = ({ folder, onSave }: { folder: Folder | null, onSave: (folder: any) => void }) => {
    const [name, setName] = useState(folder?.name || '');
    const [description, setDescription] = useState(folder?.description || '');
    const [parentId, setParentId] = useState(folder?.parentId || null);

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      onSave({ id: folder?.id, name, description, parentId });
    };

    return (
      <form onSubmit={handleSubmit}>
        <Input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        {/* Basic parent selector, can be improved with a dropdown */}
        <Input type="number" placeholder="Parent ID" value={parentId?.toString() || ''} onChange={e => setParentId(e.target.value ? BigInt(e.target.value) : null)} />
        <Button type="submit">Save</Button>
      </form>
    );
  };

  const renderFolders = (folders: Folder[]) => {
    return (
      <ul className="space-y-2">
        {folders.map(folder => (
          <li key={folder.id.toString()} className="ml-4">
            <div className="flex items-center justify-between">
              <span onClick={() => onSelectFolder(folder.id)} className="cursor-pointer">{folder.name}</span>
              <div>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={() => setEditingFolder(folder)}><Edit className="h-4 w-4" /></Button>
                </DialogTrigger>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteFolder(folder.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            {folder.children && folder.children.length > 0 && renderFolders(folder.children)}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <Dialog>
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            Bookmark Folders
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => setEditingFolder(null)}><PlusCircle className="h-4 w-4 mr-2" /> New</Button>
            </DialogTrigger>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderFolders(folders)}
        </CardContent>
      </Card>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingFolder ? 'Edit Folder' : 'New Folder'}</DialogTitle>
        </DialogHeader>
        <FolderForm folder={editingFolder} onSave={handleSaveFolder} />
      </DialogContent>
    </Dialog>
  );
};

export default FolderTree;
