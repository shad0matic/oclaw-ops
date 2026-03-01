"use client";

import { useState } from 'react';
import { ChecklistItems } from './ChecklistItems';
import { AddSubtaskModal } from './AddSubtaskModal';

const priorityColors = {
  high: '🔴',
  medium: '🟡',
  low: '🟢',
};

interface TodoItemProps {
  todo: any;
  onUpdate: () => void;
  isSubtask?: boolean;
}

export function TodoItem({ todo, onUpdate, isSubtask = false }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showSubtaskModal, setShowSubtaskModal] = useState(false);

  const hasSubtasks = todo.subtasks && todo.subtasks.length > 0;
  const hasChecklist = todo.checklist_items && todo.checklist_items.length > 0;

  // Calculate progress
  const completedSubtasks = todo.subtasks?.filter((st: any) => st.status === 'completed').length || 0;
  const totalSubtasks = todo.subtasks?.length || 0;
  const completedChecklistItems = todo.checklist_items?.filter((item: any) => item.is_completed).length || 0;
  const totalChecklistItems = todo.checklist_items?.length || 0;

  const handleUpdate = async () => {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });
    setIsEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this todo?')) {
      await fetch(`/api/todos/${todo.id}`, {
        method: 'DELETE',
      });
      onUpdate();
    }
  };

  const toggleDone = async () => {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: todo.status === 'completed' ? 'new' : 'completed' }),
    });
    onUpdate();
  };

  return (
    <div className={`${isSubtask ? 'ml-8' : ''}`}>
      <div className="flex items-start justify-between p-4 bg-gray-100 rounded-lg mb-2">
        <div className="flex items-start space-x-3 flex-1">
          {(hasSubtasks || hasChecklist) && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 text-gray-500 hover:text-gray-700 text-lg"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          <input
            type="checkbox"
            checked={todo.status === 'completed'}
            onChange={toggleDone}
            className="mt-1 w-5 h-5 cursor-pointer"
          />
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="text-xl">{priorityColors[todo.priority as keyof typeof priorityColors]}</span>
              {isEditing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded"
                  autoFocus
                />
              ) : (
                <span 
                  className={`text-lg cursor-pointer ${todo.status === 'completed' ? 'line-through text-gray-500' : ''}`}
                  onClick={() => setIsEditing(true)}
                >
                  {todo.title}
                </span>
              )}
            </div>
            
            {/* Progress indicators */}
            {(totalSubtasks > 0 || totalChecklistItems > 0) && (
              <div className="mt-1 text-sm text-gray-600 space-x-3">
                {totalSubtasks > 0 && (
                  <span>📋 {completedSubtasks}/{totalSubtasks} subtasks</span>
                )}
                {totalChecklistItems > 0 && (
                  <span>✓ {completedChecklistItems}/{totalChecklistItems} checklist</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <button 
              onClick={handleUpdate}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
          ) : (
            <>
              {!isSubtask && (
                <button 
                  onClick={() => setShowSubtaskModal(true)}
                  className="px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
                  title="Add subtask"
                >
                  ➕
                </button>
              )}
              <button 
                onClick={() => setIsEditing(true)}
                className="px-2 py-1 hover:bg-gray-200 rounded"
              >
                ✏️
              </button>
              <button 
                onClick={handleDelete}
                className="px-2 py-1 hover:bg-gray-200 rounded"
              >
                🗑️
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded content: checklist and subtasks */}
      {isExpanded && (
        <div className="ml-4">
          {/* Checklist items */}
          {hasChecklist && (
            <ChecklistItems 
              todoId={todo.id}
              items={todo.checklist_items}
              onUpdate={onUpdate}
            />
          )}

          {/* Subtasks */}
          {hasSubtasks && (
            <div className="mt-2 space-y-2">
              {todo.subtasks.map((subtask: any) => (
                <TodoItem 
                  key={subtask.id} 
                  todo={subtask} 
                  onUpdate={onUpdate}
                  isSubtask={true}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Subtask Modal */}
      {showSubtaskModal && (
        <AddSubtaskModal
          isOpen={showSubtaskModal}
          onClose={() => setShowSubtaskModal(false)}
          parentId={todo.id}
          onAdd={onUpdate}
        />
      )}
    </div>
  );
}
