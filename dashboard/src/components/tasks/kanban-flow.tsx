'use client';

import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import { Button } from '../ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

const stages = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'planned', title: 'Queued' },
  { id: 'running', title: 'Running' },
  { id: 'review', title: 'Review Loop' },
  { id: 'todos', title: 'Human Todos' },
  { id: 'done', title: 'Done' },
];

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
  'Project A': '🌟',
  'CRM App': '👥',
  'Other': '📦',
};

interface Task {
  id: string;
  title: string;
  priority: string;
  project: string;
  description: string;
  stage: string;
}

type TasksByStage = Record<string, Task[]>;

export const KanbanFlow = () => {
  const [tasks, setTasks] = useState<TasksByStage>({
    backlog: [],
    planned: [],
    running: [],
    review: [],
    todos: [],
    done: [],
  });
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [filterProject, setFilterProject] = useState('all');

  useEffect(() => {
    // Load backlog tasks from API
    const loadBacklogTasks = async () => {
      try {
        const res = await fetch('/api/tasks/backlog');
        if (res.ok) {
          const data = await res.json();
          setTasks((prev) => ({ ...prev, backlog: data.tasks || [] }));
        }
      } catch (error) {
        console.error('Error loading backlog tasks:', error);
      }
    };
    loadBacklogTasks();
  }, []);

  const toggleDescription = (taskId: string) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    // Simple reorder within stage for now
    const { active, over } = event;
    if (!over || active.id === over.id) return;
  };

  const filteredTasks = (stageTasks: Task[]) => {
    if (filterProject === 'all') return stageTasks;
    return stageTasks.filter((t) => t.project === filterProject);
  };

  return (
    <div className="space-y-4">
      {/* Project filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button
          variant={filterProject === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilterProject('all')}
        >
          All
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

      {/* Kanban columns */}
      <div className="flex overflow-x-auto gap-4 pb-4">
        {stages.map((stage) => {
          const stageTasks = filteredTasks(tasks[stage.id] || []);
          return (
            <div key={stage.id} className="flex-shrink-0 w-[280px] border rounded-lg p-3 bg-card/30">
              <h2 className="font-medium mb-3 text-sm uppercase tracking-wider text-muted-foreground">
                {stage.title}
                <span className="ml-2 text-xs bg-muted px-1.5 py-0.5 rounded-full">{stageTasks.length}</span>
              </h2>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={stageTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {stageTasks.map((task) => (
                    <SortableItem key={task.id} id={task.id}>
                      <div className="border rounded-md p-3 mb-2 bg-card/50 cursor-grab active:cursor-grabbing">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-sm flex-1">{task.title}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleDescription(task.id)}
                          >
                            {expandedDescriptions[task.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </Button>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                          <span className={`flex items-center gap-1 ${priorityColors[task.priority || 'P9']}`}>
                            <span className={`inline-block w-2 h-2 rounded-full ${priorityDotColors[task.priority || 'P9']}`}></span>
                            {task.priority || 'P9'}
                          </span>
                          <span>{projectIcons[task.project || 'Other']} {task.project || 'Other'}</span>
                        </div>
                        {expandedDescriptions[task.id] && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            <textarea
                              className="w-full border rounded-md p-2 bg-input/50 text-xs"
                              defaultValue={task.description || 'No description.'}
                              rows={4}
                            />
                          </div>
                        )}
                      </div>
                    </SortableItem>
                  ))}
                  {stageTasks.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No tasks</p>
                  )}
                </SortableContext>
              </DndContext>
            </div>
          );
        })}
      </div>
    </div>
  );
};
