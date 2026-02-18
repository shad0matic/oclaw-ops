import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";

// GET /api/models/:id - Get a single model
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const model = await prismadb.model_catalogue.findUnique({
      where: { id: params.id },
    });

    if (!model) {
      return NextResponse.json(
        { error: "Model not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(model);
  } catch (error) {
    console.error("[MODELS_ID_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch model" },
      { status: 500 }
    );
  }
}

// PUT /api/models/:id - Update a model
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      model_id, 
      provider, 
      display_name, 
      input_cost_per_million, 
      output_cost_per_million, 
      training_date, 
      is_active 
    } = body;

    const model = await prismadb.model_catalogue.update({
      where: { id: params.id },
      data: {
        ...(model_id && { model_id }),
        ...(provider && { provider }),
        ...(display_name && { display_name }),
        ...(input_cost_per_million !== undefined && { input_cost_per_million }),
        ...(output_cost_per_million !== undefined && { output_cost_per_million }),
        ...(training_date && { training_date }),
        ...(is_active !== undefined && { is_active }),
      },
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error("[MODELS_ID_PUT]", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

// DELETE /api/models/:id - Soft delete a model (set is_active to false)
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const model = await prismadb.model_catalogue.update({
      where: { id: params.id },
      data: { is_active: false },
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error("[MODELS_ID_DELETE]", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
