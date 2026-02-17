import { NextResponse } from 'next/server';

// TODO: Implement when bookmark_folders table exists

export async function GET() {
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

export async function PUT(request: Request) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}

export async function DELETE(request: Request) {
  return new Response(null, { status: 501 });
}
