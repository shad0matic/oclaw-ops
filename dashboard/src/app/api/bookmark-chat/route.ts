import { NextResponse } from "next/server";
import { db } from "../../../lib/db";

// GET /api/bookmark-chat - Fetch chat messages for a category

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "";

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    const messages = await db.query(
      `SELECT * FROM ops.x_bookmark_chat WHERE category = $1 ORDER BY created_at ASC`,
      [category]
    );

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}

// POST /api/bookmark-chat - Send a new chat message

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { category, text, author } = body;

    if (!category || !text || !author) {
      return NextResponse.json(
        { error: "Category, text, and author are required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `INSERT INTO ops.x_bookmark_chat (category, text, author) VALUES ($1, $2, $3) RETURNING *`,
      [category, text, author]
    );

    return NextResponse.json({ message: result[0] });
  } catch (error) {
    console.error("Error sending chat message:", error);
    return NextResponse.json(
      { error: "Failed to send chat message" },
      { status: 500 }
    );
  }
}
