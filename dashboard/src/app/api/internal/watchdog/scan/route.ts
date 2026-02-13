export const dynamic = "force-dynamic"

import { NextResponse } from 'next/server';
import { z } from 'zod';

const scanRequestSchema = z.object({
  secret: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();

  const parsed = scanRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { secret } = parsed.data;

  // In a real application, the secret would be stored in an environment variable
  // and compared securely.
  if (secret !== 'your-internal-cron-secret') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // This is a placeholder for the zombie detection logic.
  // In a real application, this would call the zombie-detector.mjs script
  // or contain the detection logic directly.
  const scanned = 0;
  const newlySuspected = 0;
  const killed = 0;

  console.log('Zombie scan complete.');

  return NextResponse.json({
    status: 'completed',
    scanned,
    newly_suspected: newlySuspected,
    killed,
  });
}
