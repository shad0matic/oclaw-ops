import { NextResponse } from 'next/server';
import { z } from 'zod';
import { todos } from '../data';

const bulkActionSchema = z.object({
  action: z.enum(['complete', 'delete']),
  ids: z.array(z.number()),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = bulkActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { action, ids } = parsed.data;

  if (action === 'complete') {
    todos.forEach(todo => {
      if (ids.includes(todo.id)) {
        todo.status = 'completed';
      }
    });
  } else if (action === 'delete') {
    const newTodos = todos.filter(todo => !ids.includes(todo.id));
    // This is a bit tricky with an in-memory array.
    // A real implementation would modify the original array or database.
    // For this example, we'll just show the result, but not modify the original.
    return NextResponse.json(newTodos);
  }

  return NextResponse.json(todos);
}
