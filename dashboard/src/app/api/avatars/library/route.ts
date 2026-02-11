import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

const AVATARS_DIR = path.join(process.cwd(), "public/assets/minion-avatars");

export async function GET() {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const files = fs.readdirSync(AVATARS_DIR).filter((f) =>
            /\.(webp|png|jpg|jpeg|gif|svg)$/i.test(f)
        );

        const avatars = files.map((name) => {
            const stats = fs.statSync(path.join(AVATARS_DIR, name));
            return { name, size: stats.size };
        });

        return NextResponse.json(avatars);
    } catch (error) {
        console.error("Failed to read avatars directory", error);
        return NextResponse.json([], { status: 200 });
    }
}
