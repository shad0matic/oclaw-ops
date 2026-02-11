
import prisma from "@/lib/db";
import { NextResponse, type NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => ({} as any));
  const status = body?.status as string | undefined;

  if (!status) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 });
  }

  try {
    const updatedTask = await prisma.tasks.update({
      where: { id: BigInt(id) },
      data: { status },
    });
    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error(`Failed to update task ${id}`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
