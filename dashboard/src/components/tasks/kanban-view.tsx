'use client';

import React, { useState } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { Button } from '../ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

const priorityColors: Record<string, string> = {
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

const priorityDotColors: Record<string, string> = {
  P1: 'bg-red-500',
  P2: 'bg-red-400',
  P3: 'bg-orange-500',
  P4: 'bg-orange-400',
  P5: 'bg-yellow-500',
  P6: 'bg-yellow-400',
  P7: 'bg-green-400',
  P8: 'bg-green-500',
  P9: 'bg-gray-400',
};

const projectIcons: Record<string, string> = {
  'Minions Control': '👾',
  'OpenClaw/Kevin': '🔧',
  'Teen Founder': '🌟',
  'OpenPeople-CRM': '👥',
  'Other': '📦',
};

interface Task {
  id: string;
  title: string;
  priority?: string;
  project?: string;
  description?: string;
}

export const KanbanView = ({ tasks }: { tasks: Task[] }) => {
  const [items, setItems] = useState<Task[]>(tasks);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [filterProject, setFilterProject] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setItems((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const toggleDescription = (taskId: string) => {
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
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={filterProject === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterProject('all')}
        >
          All Projects
        </Button>
        {Object.entries(projectIcons).map(([proj, icon]) => (
          <Button
            key={proj}
            variant={filterProject === proj ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterProject(proj)}
          >
            {icon} {proj}
          </Button>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={filterPriority === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterPriority('all')}
        >
          All Priorities
        </Button>
        {Object.keys(priorityColors).map((prio) => (
          <Button
            key={prio}
            variant={filterPriority === prio ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterPriority(prio)}
            className={priorityColors[prio]}
          >
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${priorityDotColors[prio]}`}></span>
            {prio}
          </Button>
        ))}
      </div>
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {filteredItems.map((task) => (
            <SortableItem key={task.id} id={task.id}>
              <div className="flex flex-col border rounded-md p-4 bg-card/50 mb-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">{task.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm flex items-center gap-1 ${priorityColors[task.priority || 'P9']}`}>
                      <span className={`inline-block w-2 h-2 rounded-full ${priorityDotColors[task.priority || 'P9']}`}></span>
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
                      rows={4}
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
