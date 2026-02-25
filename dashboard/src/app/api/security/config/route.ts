import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { securityConfig } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET - Fetch security config
export async function GET() {
  try {
    const configs = await db.select().from(securityConfig).limit(1);
    
    if (configs.length === 0) {
      // Return default config
      return NextResponse.json({
        config: {
          tailscaleEnabled: true,
          fileAllowlist: ['/home/openclaw/.openclaw/workspace', '/home/openclaw/projects/oclaw-ops'],
          networkEgressEnabled: true,
          allowedDomains: ['api.anthropic.com', 'api.openai.com', 'api.minimax.io', 'generativelanguage.googleapis.com'],
          auditLoggingEnabled: true
        }
      });
    }
    
    const config = configs[0];
    return NextResponse.json({
      config: {
        tailscaleEnabled: config.tailscaleEnabled,
        fileAllowlist: config.fileAllowlist || [],
        networkEgressEnabled: config.networkEgressEnabled,
        allowedDomains: config.allowedDomains || [],
        auditLoggingEnabled: config.auditLoggingEnabled
      }
    });
  } catch (error) {
    console.error('Error fetching security config:', error);
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
  }
}

// POST - Save security config
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if config exists
    const existing = await db.select().from(securityConfig).limit(1);
    
    if (existing.length > 0) {
      // Update existing
      await db.update(securityConfig)
        .set({
          tailscaleEnabled: body.tailscaleEnabled,
          fileAllowlist: body.fileAllowlist,
          networkEgressEnabled: body.networkEgressEnabled,
          allowedDomains: body.allowedDomains,
          auditLoggingEnabled: body.auditLoggingEnabled,
          updatedAt: new Date()
        })
        .where(eq(securityConfig.id, existing[0].id));
    } else {
      // Insert new
      await db.insert(securityConfig).values({
        tailscaleEnabled: body.tailscaleEnabled ?? true,
        fileAllowlist: body.fileAllowlist ?? [],
        networkEgressEnabled: body.networkEgressEnabled ?? true,
        allowedDomains: body.allowedDomains ?? [],
        auditLoggingEnabled: body.auditLoggingEnabled ?? true
      });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving security config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
