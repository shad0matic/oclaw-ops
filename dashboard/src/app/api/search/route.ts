import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db'; // Use pool for raw SQL queries
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Function to extract the first H1 title from markdown
const extractTitle = (content: string) => {
  const match = content.match(/^#\s+(.*)/m);
  return match ? match[1] : 'Untitled';
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q');

  if (!q) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  try {
    // 1. Search tasks
    const taskQuery = `
      SELECT id, title, status, agent_id, epic
      FROM ops.task_queue
      WHERE title ILIKE $1 OR notes ILIKE $1 OR epic ILIKE $1
      LIMIT 10;
    `;
    const tasks = await pool.query(taskQuery, [`%${q}%`]);
    const taskResults = tasks.rows.map((task: any) => ({
      type: task.epic ? 'epic' : 'task',
      id: task.id,
      title: task.title,
      status: task.status,
      agent: task.agent_id,
      url: `/tasks/${task.id}`,
    }));

    // 2. Search files (specs and research)
    const docsDir = path.resolve(process.cwd(), '../../docs');
    const specDir = path.join(docsDir, 'specs');
    const researchDir = path.join(docsDir, 'research');

    const searchFilesInDir = async (dir: string, type: 'spec' | 'research') => {
      try {
        const filenames = await fs.readdir(dir);
        const matchedFiles = [];
        for (const filename of filenames) {
          if (filename.endsWith('.md') && filename.toLowerCase().includes(q.toLowerCase())) {
            const filePath = path.join(dir, filename);
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const { data } = matter(fileContent); // Use gray-matter to parse frontmatter if available
            matchedFiles.push({
              type,
              path: `docs/${type}s/${filename}`,
              title: data.title || extractTitle(fileContent),
              url: `/${type}s/${filename.replace(/\.md$/, '')}`,
            });
          }
        }
        return matchedFiles;
      } catch (error) {
        console.error(`Error reading directory ${dir}:`, error);
        return [];
      }
    };

    const specResults = await searchFilesInDir(specDir, 'spec');
    const researchResults = await searchFilesInDir(researchDir, 'research');

    const combinedResults = [...taskResults, ...specResults, ...researchResults];

    return NextResponse.json({ results: combinedResults });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
