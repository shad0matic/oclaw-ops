import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';

const STATUS_FILE = '/home/shad/.openclaw/workspace/research_agent_status.json';

export async function POST(req: NextRequest) {
  const { status } = await req.json();

  if (!status || (status !== 'on' && status !== 'off')) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  try {
    const statusData = await fs.readFile(STATUS_FILE, 'utf-8');
    const currentStatus = JSON.parse(statusData);
    currentStatus.status = status;
    await fs.writeFile(STATUS_FILE, JSON.stringify(currentStatus, null, 2));
    return NextResponse.json(currentStatus);
  } catch (error) {
    // If the file doesn't exist, create it.
    const newStatus = { status, lastRun: null, ideasFoundToday: 0 };
    await fs.writeFile(STATUS_FILE, JSON.stringify(newStatus, null, 2));
    return NextResponse.json(newStatus);
  }
}
