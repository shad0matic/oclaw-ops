import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// GET list of available projects for mapping dropdown
export async function GET() {
  try {
    const result = await pool.query(
      `SELECT DISTINCT project 
       FROM ops.task_queue 
       WHERE project IS NOT NULL AND project != ''
       ORDER BY project`
    );

    const projects = result.rows.map(r => r.project);
    
    // Add some common research topics that might not be in task_queue
    const additionalTopics = [
      "self-improvement",
      "ai-research", 
      "business-ideas",
      "health-wellness",
      "tech-tools",
      "personal-development"
    ];

    const allProjects = [...new Set([...projects, ...additionalTopics])].sort();

    return NextResponse.json(allProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}
