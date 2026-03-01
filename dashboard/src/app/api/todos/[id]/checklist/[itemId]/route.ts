import { NextResponse } from 'next/server';
import { z } from 'zod';
import { updateChecklistItem, deleteChecklistItem } from '../../../db';

const checklistItemUpdateSchema = z.object({
  title: z.string().optional(),
  is_completed: z.boolean().optional(),
  position: z.number().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId: itemIdStr } = await params;
    const itemId = parseInt(itemIdStr, 10);
    const body = await req.json();
    const parsed = checklistItemUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
    }

    const updatedItem = await updateChecklistItem(itemId, parsed.data);

    if (!updatedItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId: itemIdStr } = await params;
    const itemId = parseInt(itemIdStr, 10);
    await deleteChecklistItem(itemId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    return NextResponse.json({ error: 'Failed to delete checklist item' }, { status: 500 });
  }
}
