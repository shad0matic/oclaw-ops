import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const dirPath = path.join(process.cwd(), '..', 'planning', 'feature-requests');
  const tasks: any[] = [];

  try {
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
        const title = file.replace('.md', '');
        const priority = content.match(/Priority:\s*(P[1-9])/i)?.[1] || 'P9';
        const project = content.match(/Project:\s*(.+)/i)?.[1]?.trim() || 'Other';
        tasks.push({
          id: `backlog-${title}`,
          title,
          priority,
          project,
          description: content.slice(0, 500),
          stage: 'backlog',
        });
      }
    }
  } catch (error) {
    console.error('Error reading backlog:', error);
  }

  // Sort by priority
  tasks.sort((a, b) => a.priority.localeCompare(b.priority));

  return NextResponse.json({ tasks });
}
