import React, { useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { Button } from '../ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

const priorityColors = {
  P1: 'text-red-500',
  P2: 'text-red-400',
  P3: 'text-orange-500',
  P4: 'text-orange-400',
  P5: 'text-yellow-500',
  P6: 'text-yellow-400',
  P7: 'text-green-400',
  P8: 'text-green-500',
  P9: 'text-gray-400',
};

const projectIcons = {
  'Minions Control': '👾',
  'OpenClaw/Kevin': '🔧',
  'Teen Founder': '🌟',
  'OpenPeople-CRM': '👥',
  'Other': '📦',
};

export const KanbanView = ({ tasks }) => {
  const [items, setItems] = useState(tasks);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [filterProject, setFilterProject] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const toggleDescription = (taskId) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const filteredItems = items.filter((item) => {
    if (filterProject !== 'all' && item.project !== filterProject) return false;
    if (filterPriority !== 'all' && item.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 mb-4">
        <select 
          value={filterProject} 
          onChange={(e) => setFilterProject(e.target.value)}
          className="border rounded-md p-2"
        >
          <option value="all">All Projects</option>
          {Object.keys(projectIcons).map((proj) => (
            <option key={proj} value={proj}>{proj}</option>
          ))}
        </select>
        <select 
          value={filterPriority} 
          onChange={(e) => setFilterPriority(e.target.value)}
          className="border rounded-md p-2"
        >
          <option value="all">All Priorities</option>
          {Object.keys(priorityColors).map((prio) => (
            <option key={prio} value={prio}>{prio}</option>
          ))}
        </select>
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredItems} strategy={verticalListSortingStrategy}>
          {filteredItems.map((task) => (
            <SortableItem key={task.id} id={task.id}>
              <div className="flex flex-col border rounded-md p-4 bg-card/50">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{task.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${priorityColors[task.priority || 'P9']}`}>
                      <span className="inline-block w-2 h-2 rounded-full mr-1 bg-current"></span>
                      {task.priority || 'P9'}
                    </span>
                    <span>{projectIcons[task.project || 'Other']}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => toggleDescription(task.id)}
                    >
                      {expandedDescriptions[task.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>
                  </div>
                </div>
                {expandedDescriptions[task.id] && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    <textarea 
                      className="w-full border rounded-md p-2 bg-input/50"
                      defaultValue={task.description || 'No description provided.'}
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
};