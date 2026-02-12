import { promises as fs } from 'fs';
import { NextRequest, NextResponse } from 'next/server';

const STATUS_FILE = '/home/shad/.openclaw/workspace/research_agent_status.json';

export async function GET(req: NextRequest) {
  try {
    const statusData = await fs.readFile(STATUS_FILE, 'utf-8');
    return NextResponse.json(JSON.parse(statusData));
  } catch (error) {
    // If the file doesn't exist, assume the agent is off.
    return NextResponse.json({ status: 'off', lastRun: null, ideasFoundToday: 0 });
  }
}
