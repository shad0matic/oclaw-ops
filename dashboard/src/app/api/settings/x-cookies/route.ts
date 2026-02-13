import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { execSync } from 'child_process';
import { parseStringId } from '@/lib/validate';

export const dynamic = "force-dynamic";

const configPath = '/home/shad/.openclaw/phil-config.json';
const birdCliPath = '/home/shad/.local/share/pnpm/bird';

const configSchema = z.object({
  auth_token: z.string(),
  ct0: z.string(),
});

type PhilConfig = {
  auth_token: string;
  ct0: string;
  last_tested: string | null;
  status: 'valid' | 'expired' | 'missing';
  username?: string;
};

async function readConfig(): Promise<PhilConfig> {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        auth_token: '',
        ct0: '',
        last_tested: null,
        status: 'missing',
      };
    }
    throw error;
  }
}

async function writeConfig(config: PhilConfig): Promise<void> {
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

async function testCookies(auth_token: string, ct0: string): Promise<{ valid: boolean, username?: string, error?: string }> {
    if (!auth_token || !ct0) {
        return { valid: false, error: 'Missing auth_token or ct0' };
    }
    try {
        const command = `${birdCliPath} --auth-token "${auth_token}" --ct0 "${ct0}" whoami --plain --json`;
        const result = execSync(command, { encoding: 'utf8' });
        const data = JSON.parse(result);
        if (data.valid) {
            return { valid: true, username: data.username };
        }
        return { valid: false, error: 'Invalid credentials' };
    } catch (error) {
        console.error('Error testing bird CLI:', error);
        return { valid: false, error: error.message };
    }
}

export async function GET() {
  const config = await readConfig();
  return NextResponse.json({
    status: config.status,
    lastTested: config.last_tested,
    username: config.username,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  
  const parsed = configSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { auth_token, ct0 } = parsed.data;

  const testResult = await testCookies(auth_token, ct0);

  const newConfig: PhilConfig = {
    auth_token,
    ct0,
    last_tested: new Date().toISOString(),
    status: testResult.valid ? 'valid' : 'expired',
    username: testResult.username,
  };

  await writeConfig(newConfig);

  return NextResponse.json({
    status: newConfig.status,
    lastTested: newConfig.last_tested,
    username: newConfig.username,
  });
}
