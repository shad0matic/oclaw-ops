import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAllTodos, createTodo } from './db';

const todoSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['new', 'in_progress', 'completed', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  parent_id: z.number().optional(),
  due_date: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy');

    let todos = await getAllTodos();

    // Apply filters
    if (status && status !== 'all') {
      if (status === 'active') {
        todos = todos.filter(todo => todo.status !== 'completed' && todo.status !== 'archived');
      } else {
        todos = todos.filter(todo => todo.status === status);
      }
    }

    if (priority && priority !== 'all') {
      todos = todos.filter(todo => todo.priority === priority);
    }

    if (search) {
      todos = todos.filter(todo => 
        todo.title.toLowerCase().includes(search.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(search.toLowerCase()))
      );
    }

    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case 'due_date':
          todos.sort((a, b) => (new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime()));
          break;
        case 'priority':
          const priorityMap = { high: 0, medium: 1, low: 2 };
          todos.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);
          break;
        case 'created_at':
          todos.sort((a, b) => (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
          break;
        default:
          break;
      }
    }

    return NextResponse.json(todos);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = todoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const newTodo = await createTodo({
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status || 'new',
      priority: parsed.data.priority || 'medium',
      parent_id: parsed.data.parent_id,
      due_date: parsed.data.due_date ? new Date(parsed.data.due_date) : undefined,
    });

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}
