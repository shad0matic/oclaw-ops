
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query('SELECT agent_id, name, emoji, model, description FROM memory.agent_profiles');
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch agent profiles:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { agentId, model } = await request.json();

    if (!agentId || !model) {
      return NextResponse.json({ error: 'agentId and model are required' }, { status: 400 });
    }

    const { rowCount } = await pool.query(
      'UPDATE memory.agent_profiles SET model = $1 WHERE agent_id = $2',
      [model, agentId]
    );

    if (rowCount === 0) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Agent model updated successfully' });
  } catch (error) {
    console.error('Failed to update agent model:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
