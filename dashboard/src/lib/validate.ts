import { NextResponse } from "next/server"

/** Validate and parse a numeric ID from route params. Returns [numId, null] or [null, errorResponse]. */
export function parseNumericId(id: string): [number, null] | [null, NextResponse] {
    const num = Number(id)
    if (!Number.isInteger(num) || num <= 0) {
        return [null, NextResponse.json({ error: "Invalid ID" }, { status: 400 })]
    }
    return [num, null]
}

/** Validate a string ID (agent_id style). Must be alphanumeric + hyphens/underscores, max 64 chars. */
export function parseStringId(id: string): [string, null] | [null, NextResponse] {
    if (!id || id.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
        return [null, NextResponse.json({ error: "Invalid ID" }, { status: 400 })]
    }
    return [id, null]
}
