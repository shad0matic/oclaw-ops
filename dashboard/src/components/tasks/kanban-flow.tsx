import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from './sortable-item';
import fs from 'fs';
import path from 'path';

const stages = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'planned', title: 'Planned' },
  { id: 'running', title: 'Running' },
  { id: 'review', title: 'Review Loop' },
  { id: 'todos', title: 'Human Todos' },
  { id: 'done', title: 'Done' },
];

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

export const KanbanFlow = () => {
  const [tasks, setTasks] = useState({
    backlog: [],
    planned: [],
    running: [],
    review: [],
    todos: [],
    done: [],
  });

  useEffect(() => {
    // Load tasks from planning/feature-requests/*.md
    const loadBacklogTasks = async () => {
      const dirPath = '/home/shad/projects/oclaw-ops/dashboard/planning/feature-requests';
      try {
        const files = fs.readdirSync(dirPath);
        const backlogTasks = files.map((file) => {
          const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
          const title = file.replace('.md', '');
          const priority = content.match(/Priority: (P[1-9])/i)?.[1] || 'P9';
          const project = content.match(/Project: (.+)/i)?.[1] || 'Other';
          const description = content;
          return { id: `backlog-${title}`, title, priority, project, description, stage: 'backlog' };
        });
        setTasks((prev) => ({ ...prev, backlog: backlogTasks }));
      } catch (error) {
        console.error('Error loading backlog tasks:', error);
      }
    };
    loadBacklogTasks();
  }, []);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    const activeId = active.id;
    const overId = over.id;

    if (activeId !== overId) {
      const activeStage = active.data.current?.stage;
      const overStage = over.data.current?.stage;

      if (activeStage !== overStage) {
        // Moving between stages
        setTasks((prevTasks) => {
          const activeTask = prevTasks[activeStage].find((t) => t.id === activeId);
          if (!activeTask) return prevTasks;

          // Conflict detection
          if (overStage === 'running' && prevTasks.running.some((t) => t.project === activeTask.project)) {
            alert(`Conflict: A task for ${activeTask.project} is already running.`);
            return prevTasks;
          }

          const updatedActiveStage = prevTasks[activeStage].filter((t) => t.id !== activeId);
          activeTask.stage = overStage;
          const updatedOverStage = [...prevTasks[overStage], activeTask];

          return {
            ...prevTasks,
            [activeStage]: updatedActiveStage,
            [overStage]: updatedOverStage,
          };
        });
      } else {
        // Moving within the same stage
        setTasks((prevTasks) => {
          const stageTasks = prevTasks[activeStage];
          const oldIndex = stageTasks.findIndex((item) => item.id === activeId);
          const newIndex = stageTasks.findIndex((item) => item.id === overId);
          const updatedTasks = arrayMove(stageTasks, oldIndex, newIndex);
          return {
            ...prevTasks,
            [activeStage]: updatedTasks,
          };
        });
      }
    }
  };

  // Auto-progression logic (simulated for now)
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks((prevTasks) => {
        const updatedTasks = { ...prevTasks };
        // Example: Auto move tasks from 'running' to 'review' after some condition
        updatedTasks.running.forEach((task) => {
          if (/* some condition, e.g., time elapsed or task completed */ false) {
            updatedTasks.running = updatedTasks.running.filter((t) => t.id !== task.id);
            task.stage = 'review';
            updatedTasks.review.push(task);
          }
        });
        return updatedTasks;
      });
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex overflow-x-auto space-x-4 pb-4">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {stages.map((stage) => (
          <div key={stage.id} className="flex-1 min-w-[300px] border rounded-md p-4 bg-card/30">
            <h2 className="font-medium mb-4">{stage.title}</h2>
            <SortableContext items={tasks[stage.id].map((t) => t.id)} strategy={horizontalListSortingStrategy}>
              {tasks[stage.id].map((task) => (
                <SortableItem key={task.id} id={task.id} data={{ stage: stage.id }}>
                  <div className="border rounded-md p-3 mb-2 bg-card/50">
                    <h3 className="font-medium">{task.title}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                      <span className={priorityColors[task.priority || 'P9']}>
                        <span className="inline-block w-2 h-2 rounded-full mr-1 bg-current"></span>
                        {task.priority || 'P9'}
                      </span>
                      <span>{projectIcons[task.project || 'Other']}</span>
                    </div>
                  </div>
                </SortableItem>
              ))}
            </SortableContext>
          </div>
        ))}
      </DndContext>
    </div>
  );
};