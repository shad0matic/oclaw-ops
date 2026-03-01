import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getChecklistItems, createChecklistItem } from '../../db';

const checklistItemSchema = z.object({
  title: z.string().min(1),
  position: z.number().optional(),
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const todoId = parseInt(idStr, 10);
    const items = await getChecklistItems(todoId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching checklist items:', error);
    return NextResponse.json({ error: 'Failed to fetch checklist items' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idStr } = await params;
    const todoId = parseInt(idStr, 10);
    const body = await req.json();
    const parsed = checklistItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const newItem = await createChecklistItem({
      todo_id: todoId,
      title: parsed.data.title,
      position: parsed.data.position,
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating checklist item:', error);
    return NextResponse.json({ error: 'Failed to create checklist item' }, { status: 500 });
  }
}
