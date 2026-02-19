import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { execSync } from 'child_process';

export const dynamic = "force-dynamic";

const configPath = '/home/openclaw/.openclaw/phil-config.json';
const birdCliPath = '/home/openclaw/.local/share/pnpm/bird';

const cookiesSchema = z.object({
  auth_token: z.string(),
  ct0: z.string(),
});

const configSchema = z.object({
  cookies: cookiesSchema,
  validated: z.boolean(),
  username: z.string().optional(),
  last_tested: z.string().optional(),
});

type PhilConfig = z.infer<typeof configSchema>;

async function readConfig(): Promise<PhilConfig> {
  try {
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        cookies: { auth_token: '', ct0: '' },
        validated: false,
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
        const command = `${birdCliPath} --auth-token "${auth_token}" --ct0 "${ct0}" whoami --plain`;
        const result = execSync(command, { encoding: 'utf8', timeout: 15000 });
        const userMatch = result.match(/user:\s*@(\S+)/);
        if (userMatch) {
            return { valid: true, username: userMatch[1] };
        }
        return { valid: false, error: 'Could not parse whoami output' };
    } catch (error) {
        console.error('Error testing bird CLI:', error);
        return { valid: false, error: (error as Error).message };
    }
}

export async function GET() {
  const config = await readConfig();
  return NextResponse.json({
    status: config.validated ? 'valid' : (config.cookies.auth_token ? 'expired' : 'missing'),
    lastTested: config.last_tested,
    username: config.username,
  });
}

export async function POST(req: Request) {
  const body = await req.json();

  const parsed = cookiesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { auth_token, ct0 } = parsed.data;

  const testResult = await testCookies(auth_token, ct0);

  const newConfig: PhilConfig = {
    cookies: { auth_token, ct0 },
    validated: testResult.valid,
    username: testResult.username,
    last_tested: new Date().toISOString(),
  };

  await writeConfig(newConfig);

  return NextResponse.json({
    status: newConfig.validated ? 'valid' : 'expired',
    lastTested: newConfig.last_tested,
    username: newConfig.username,
  });
}
