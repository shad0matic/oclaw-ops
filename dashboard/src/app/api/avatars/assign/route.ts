import { NextResponse } from "next/server";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

const AVATARS_DIR = path.join(process.cwd(), "public/assets/minion-avatars");

export async function POST(req: Request) {
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { agentId, avatarFile } = await req.json();

        if (!agentId || !avatarFile) {
            return NextResponse.json({ error: "agentId and avatarFile required" }, { status: 400 });
        }

        // Verify the avatar file exists in library
        const srcPath = path.join(AVATARS_DIR, avatarFile);
        if (!fs.existsSync(srcPath)) {
            return NextResponse.json({ error: "Avatar file not found" }, { status: 404 });
        }

        // Copy/link as agent's avatar (agent_id.webp)
        const ext = path.extname(avatarFile);
        const destPath = path.join(AVATARS_DIR, `${agentId}${ext}`);

        // Don't overwrite if source == dest
        if (path.resolve(srcPath) !== path.resolve(destPath)) {
            fs.copyFileSync(srcPath, destPath);
        }

        return NextResponse.json({ success: true, avatar: `${agentId}${ext}` });
    } catch (error) {
        console.error("Failed to assign avatar", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
