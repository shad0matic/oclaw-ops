"use client";

import { useState } from 'react';

interface ChecklistItem {
  id: number;
  todo_id: number;
  title: string;
  is_completed: boolean;
}

interface ChecklistItemsProps {
  todoId: number;
  items: ChecklistItem[];
  onUpdate: () => void;
}

export function ChecklistItems({ todoId, items, onUpdate }: ChecklistItemsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');

  const handleToggleItem = async (itemId: number, isCompleted: boolean) => {
    await fetch(`/api/todos/${todoId}/checklist/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_completed: !isCompleted }),
    });
    onUpdate();
  };

  const handleDeleteItem = async (itemId: number) => {
    await fetch(`/api/todos/${todoId}/checklist/${itemId}`, {
      method: 'DELETE',
    });
    onUpdate();
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    
    await fetch(`/api/todos/${todoId}/checklist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newItemTitle }),
    });
    
    setNewItemTitle('');
    setIsAdding(false);
    onUpdate();
  };

  return (
    <div className="bg-white p-3 rounded border border-gray-200 mt-2">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between group hover:bg-gray-50 p-1 rounded">
            <div className="flex items-center space-x-2 flex-1">
              <input
                type="checkbox"
                checked={item.is_completed}
                onChange={() => handleToggleItem(item.id, item.is_completed)}
                className="w-4 h-4 cursor-pointer"
              />
              <span className={`text-sm ${item.is_completed ? 'line-through text-gray-500' : ''}`}>
                {item.title}
              </span>
            </div>
            <button
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 px-2"
              onClick={() => handleDeleteItem(item.id)}
            >
              ✕
            </button>
          </div>
        ))}

        {isAdding ? (
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="text"
              placeholder="Checklist item..."
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddItem();
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewItemTitle('');
                }
              }}
              className="flex-1 px-2 py-1 text-sm border rounded"
              autoFocus
            />
            <button
              onClick={handleAddItem}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewItemTitle('');
              }}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-gray-600 hover:text-gray-900 mt-2 flex items-center space-x-1"
          >
            <span>➕</span>
            <span>Add checklist item</span>
          </button>
        )}
      </div>
    </div>
  );
}
