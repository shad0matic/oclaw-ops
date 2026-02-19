export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

// Helper function to extract the first heading
const getTitle = (content: string, fallback: string) => {
  const match = content.match(/^#\s+(.*)/m);
  return match ? match[1] : fallback;
};

// Priority mapping
const priorityOrder: { [key: string]: number } = { high: 0, medium: 1, low: 2 };
const projectOrder: { [key: string]: number } = { 'oclaw-ops': 0, 'taskbee': 1, 'openpeople': 2 };

// PATCH /api/tasks/backlog — update a feature request file's frontmatter status
export async function PATCH(request: NextRequest) {
  const { filename, status } = await request.json();
  if (!filename || !status) {
    return NextResponse.json({ error: "filename and status required" }, { status: 400 });
  }

  const dirPath = '/home/openclaw/.openclaw/workspace/planning/feature-requests/';
  const filePath = path.join(dirPath, filename);

  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    data.status = status;
    const updated = matter.stringify(content, data);
    await fs.writeFile(filePath, updated, 'utf-8');
    return NextResponse.json({ ok: true, filename, status });
  } catch (error) {
    console.error('Error updating feature request:', error);
    return NextResponse.json({ error: "Failed to update file" }, { status: 500 });
  }
}

export async function GET() {
  const dirPath = '/home/openclaw/.openclaw/workspace/planning/feature-requests/';
  const items: any[] = [];

  try {
    const files = await fs.readdir(dirPath);

    for (const file of files) {
      if (file === 'TEMPLATE.md' || !file.endsWith('.md')) {
        continue;
      }

      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        continue;
      }
      
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data, content } = matter(fileContent);

      if (data.status !== 'backlog') {
        continue;
      }
      
      const filenameWithoutExt = path.basename(file, path.extname(file));

      items.push({
        id: `backlog-${filenameWithoutExt}`,
        filename: file,
        title: getTitle(content, filenameWithoutExt.replace(/-/g, ' ')),
        project: data.project || 'other',
        priority: data.priority || 'low',
        status: data.status,
        assigned: data.assigned || null,
        tags: data.tags || [],
        depends_on: data.depends_on || null,
        description: content.trim().substring(0, 200),
      });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`Directory not found: ${dirPath}`);
      return NextResponse.json([]);
    }
    console.error('Error reading feature requests:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  // Sort items
  items.sort((a, b) => {
    const projectA = projectOrder[a.project] ?? 3;
    const projectB = projectOrder[b.project] ?? 3;
    if (projectA !== projectB) {
      return projectA - projectB;
    }
    const priorityA = priorityOrder[a.priority] ?? 3;
    const priorityB = priorityOrder[b.priority] ?? 3;
    return priorityA - priorityB;
  });

  return NextResponse.json(items);
}
