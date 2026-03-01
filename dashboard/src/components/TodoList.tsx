"use client";

import { useEffect, useState } from 'react';
import { TodoItem } from './TodoItem';
import { AddTodoModal } from './AddTodoModal';

export function TodoList() {
  const [todos, setTodos] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTodos = async () => {
    const res = await fetch('/api/todos');
    const data = await res.json();
    setTodos(data);
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Todo
        </button>
      </div>
      <div className="space-y-4">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} onUpdate={fetchTodos} />
        ))}
      </div>
      <AddTodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={fetchTodos}
      />
    </div>
  );
}
