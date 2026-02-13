import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const AVATARS_DIR = path.join(process.cwd(), "public/assets/minion-avatars");

export async function POST(req: Request) {

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const filename = formData.get("filename") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const safeName = (filename || file.name)
            .replace(/[^a-zA-Z0-9._-]/g, "-")
            .toLowerCase();

        const buffer = Buffer.from(await file.arrayBuffer());
        const destPath = path.join(AVATARS_DIR, safeName);
        fs.writeFileSync(destPath, buffer);

        return NextResponse.json({
            success: true,
            avatar: { name: safeName, size: buffer.length },
        });
    } catch (error) {
        console.error("Failed to upload avatar", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
