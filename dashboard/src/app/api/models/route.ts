import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prismadb from "@/lib/prismadb";

// GET /api/models - List all models with filtering
export async function GET(req: Request) {
  try {
    const session = await auth();

    // Check if user is authenticated
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider");
    const isActive = searchParams.get("isActive") === "true";

    const models = await prismadb.model_catalogue.findMany({
      where: {
        ...(provider && { provider }),
        ...(searchParams.get("isActive") !== null && { is_active: isActive }),
      },
      orderBy: { display_name: "asc" },
    });

    return NextResponse.json(models);
  } catch (error) {
    console.error("[MODELS_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

// POST /api/models - Add a new model
export async function POST(req: Request) {
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

    const model = await prismadb.model_catalogue.create({
      data: {
        model_id,
        provider,
        display_name,
        input_cost_per_million,
        output_cost_per_million,
        training_date,
        is_active: is_active ?? true,
      },
    });

    return NextResponse.json(model);
  } catch (error) {
    console.error("[MODELS_POST]", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}
